import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  ExperimentName,
  TvAdoptionExtensionType,
  TvAdoptionTrialUserExperimentValue,
} from '../dtos/experiment.dto';
import { TvAdoptionData } from '../interfaces/tvAdoption.interface';
import { TvAdoptionRedisValue } from '../interfaces/tvAdoption.interface';
import { ExperimentService } from '../services/experiment.service';
import { UserSubscriptionService } from '../services/userSubscription.service';
import { WatchVideoService } from '../services/watchVideo.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { EnvironmentEnum } from '@app/common/enums/common.enums';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { RedisService } from '@app/redis';
interface TvAdoptionSubscriptionExtensionMessage {
  userId: string;
}

@Injectable()
export class TvAdoptionSubscriptionExtensionConsumerService
  implements
    OnModuleInit,
    OnModuleDestroy,
    BatchHandler<TvAdoptionSubscriptionExtensionMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(
    TvAdoptionSubscriptionExtensionConsumerService.name,
  );
  private readonly TOPIC = APP_CONFIGS.KAFKA.USER_SUBSCRIPTION_CHANGES_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly watchVideoService: WatchVideoService,
    private readonly redisService: RedisService,
    private readonly experimentService: ExperimentService,
  ) {}

  private async checkTvAdoptionFlowExperiment(
    userId: string,
  ): Promise<boolean> {
    try {
      const experiment = await this.experimentService.getExperiment(
        userId,
        ExperimentName.TvAdoptionTrialUserExperiment,
      );
      const tvAdoptionFlow = (
        experiment.value as TvAdoptionTrialUserExperimentValue
      ).extensionType;

      if (tvAdoptionFlow !== TvAdoptionExtensionType.SUBSCRIPTION_EXTENSION) {
        this.logger.log(
          { tvAdoptionFlow, userId },
          `User cohort not eligible for subscription extension in TV adoption extension experiment`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to get TV adoption flow experiment from Statsig`,
      );
      return false;
    }
  }

  private async processTvAdoptionForSubscriptionExtensionUser(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    redisKey: string,
    tvAdoptionData: TvAdoptionData,
  ): Promise<boolean> {
    try {
      await this.userSubscriptionService.giveTvAdoptionToSubscriptionExtensionUser(
        userId,
        latestSubscriptionHistory,
      );

      // On success, update Redis with TVadoptionValue as extend_free_subscription
      tvAdoptionData.TVadoptionValue =
        TvAdoptionRedisValue.EXTEND_FREE_SUBSCRIPTION;
      await this.redisService.set(redisKey, JSON.stringify(tvAdoptionData));

      this.logger.log(
        {
          redisKey,
          userId,
        },
        `Successfully gave TV adoption to subscription extension user`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to give TV adoption to subscription extension user`,
      );
      return false;
    }
  }

  async handleBatch(
    messages: TvAdoptionSubscriptionExtensionMessage[],
  ): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    if (!APP_CONFIGS.KAFKA.WATCHED_VIDEO_TV_ADOPTION_CONSUMER_ENABLED) {
      return true;
    }

    for (const message of messages) {
      try {
        if (!message.userId) {
          this.logger.warn({ message }, `Message missing userId, skipping`);
          continue;
        }

        const userWatchedOnPlatformTV =
          await this.watchVideoService.hasUserWatchedContentOnTvPlatform(
            message.userId,
          );

        if (!userWatchedOnPlatformTV) {
          this.logger.warn(
            { userId: message.userId },
            `User has not watched content on TV platform till mandate success, skipping`,
          );
          continue;
        }

        const redisKey = `${message.userId}_tvadoption`;
        const redisValue = await this.redisService.get(redisKey);

        const tvAdoptionData: TvAdoptionData = redisValue
          ? JSON.parse(redisValue)
          : {
              TVadoptionValue: null,
              watch_video_tv: true,
            };

        //check if redisValue exists and tvAdoptionvalue is not null or undefined
        if (redisValue && tvAdoptionData.TVadoptionValue) {
          this.logger.log(
            { userId: message.userId },
            `User already has TV adoption subscription extension`,
          );
          continue;
        }
        const userSubscriptionHistoriesCount =
          await this.userSubscriptionService.getAllSubscriptionHistoryCountOfUser(
            message.userId,
          );
        if (userSubscriptionHistoriesCount.count > 2) {
          this.logger.log(
            { userId: message.userId },
            `User already has more than 2 subscription histories, meaning this is not after trial first subscription , skipping`,
          );
          continue;
        }
        const latestSubscriptionHistoryResults =
          await this.userSubscriptionService.getLatestSubscriptionHistoryForTvAdoption(
            message.userId,
            false,
          );
        if (
          !latestSubscriptionHistoryResults?.giveTvAdoption ||
          !latestSubscriptionHistoryResults.latestSubscriptionHistory
        ) {
          this.logger.log(
            { userId: message.userId },
            `User is not eligible for TV adoption subscription extension as per latest subscription history`,
          );
          continue;
        }

        // Get TV adoption flow from Statsig experiment
        const isEligibleForSubscriptionExtension =
          await this.checkTvAdoptionFlowExperiment(message.userId);
        if (!isEligibleForSubscriptionExtension) {
          continue;
        }

        // Give TV adoption to subscription extension user
        await this.processTvAdoptionForSubscriptionExtensionUser(
          message.userId,
          latestSubscriptionHistoryResults.latestSubscriptionHistory,
          redisKey,
          tvAdoptionData,
        );
      } catch (error) {
        this.logger.error(
          { error, userId: message.userId },
          `Error processing TV adoption subscription extension for user`,
        );
        // Continue processing other messages
      }
    }

    return true;
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.ENV === EnvironmentEnum.TEST) {
      return;
    }

    this.logger.log(
      `Initializing TV adoption subscription extension consumer for topic: ${this.TOPIC}, groupId: ${APP_CONFIGS.KAFKA.GROUP_ID_TV_ADOPTION_SUBSCRIPTION_EXTENSION}, brokers: ${this.BROKERS.join(',')}`,
    );
    this.kafkaService
      .connect()
      .then(() => {
        this.kafkaService
          .subscribe(
            this.TOPIC,
            {
              brokers: this.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              flushInterval: 30000,
              groupId:
                APP_CONFIGS.KAFKA.GROUP_ID_TV_ADOPTION_SUBSCRIPTION_EXTENSION,
            },
            this,
          )
          .then(() => {
            this.logger.log(
              `Successfully subscribed to Kafka topic ${this.TOPIC}`,
            );
          });
      })
      .catch((error) => {
        this.logger.error(
          { error },
          `Failed to connect to Kafka brokers for topic ${this.TOPIC}`,
        );
        // Don't throw error to prevent blocking server startup
      });
  }
}
