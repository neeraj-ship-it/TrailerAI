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
import { WVEvent } from '../interfaces/ncanto.interfaces';
import { ExperimentService } from '../services/experiment.service';
import { StatsigService } from '../services/statsig.service';
import { UserSubscriptionService } from '../services/userSubscription.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { Platform } from '@app/common/enums/app.enum';
import { EnvironmentEnum } from '@app/common/enums/common.enums';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { RedisService } from '@app/redis';

interface TVAdoptionData {
  TVadoptionValue: string | null;
  watch_video_tv: boolean;
}
enum TvAdoptionRedisValue {
  EXTEND_FREE_SUBSCRIPTION = 'extend_free_subscription',
  EXTEND_FREE_TRIAL = 'extend_free_trial',
}

@Injectable()
export class UserWatchedVideoSecondaryConsumerService
  implements OnModuleInit, OnModuleDestroy, BatchHandler<WVEvent>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(
    UserWatchedVideoSecondaryConsumerService.name,
  );
  private readonly TOPIC = APP_CONFIGS.KAFKA.WATCHED_VIDEO_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly statsigService: StatsigService,
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

      if (tvAdoptionFlow !== TvAdoptionExtensionType.TRIAL_EXTENSION) {
        this.logger.log(
          { tvAdoptionFlow, userId },
          `User: ${userId},experimentValue: ${experiment.value}, tvAdoptionFlow: ${tvAdoptionFlow} not eligible for trial extension in TV adoption extension experiment`,
        );
        return false;
      }
      this.logger.log(
        { tvAdoptionFlow, userId },
        `User: ${userId},experimentValue: ${experiment.value}, tvAdoptionFlow: ${tvAdoptionFlow} eligible for trial extension in TV adoption extension experiment`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to get TV adoption flow experiment from Statsig`,
      );
      return false;
    }
  }

  private async processTvAdoptionForTrialUser(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    redisKey: string,
    tvAdoptionData: TVAdoptionData,
  ): Promise<boolean> {
    try {
      await this.userSubscriptionService.giveTvAdoptionToTrialUser(
        userId,
        latestSubscriptionHistory,
      );

      this.logger.log(
        {
          userId,
        },
        `Successfully gave TV adoption to trial user`,
      );

      // On success, update Redis with TVadoptionValue as extend_free_trial
      tvAdoptionData.TVadoptionValue = TvAdoptionRedisValue.EXTEND_FREE_TRIAL;
      await this.redisService.set(redisKey, JSON.stringify(tvAdoptionData));

      this.logger.log(
        {
          redisKey,
          userId,
        },
        `Successfully updated Redis with TVadoptionValue as extend_free_trial`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        {
          error,
          userId,
        },
        `Failed to give TV adoption to trial user`,
      );
      return false;
    }
  }

  async handleBatch(messages: WVEvent[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    if (!APP_CONFIGS.KAFKA.WATCHED_VIDEO_TV_ADOPTION_CONSUMER_ENABLED) {
      return true;
    }

    for (const message of messages) {
      try {
        // Skip events that are not from TV platform
        if (message.platform !== Platform.TV) {
          this.logger.log(
            { platform: message.platform },
            `Skipping event as it is not from TV platform`,
          );
          continue;
        }

        const redisKey = `${message.user_id}_tvadoption`;
        const redisValue = await this.redisService.get(redisKey);

        const tvAdoptionData: TVAdoptionData = redisValue
          ? JSON.parse(redisValue)
          : {
              TVadoptionValue: null,
              watch_video_tv: true,
            };

        //check if redisValue exists and tvAdoptionvalue is not null or undefined
        if (redisValue && tvAdoptionData.TVadoptionValue) {
          this.logger.log(
            { userId: message.user_id },
            `User already has TV adoption extension`,
          );
          continue;
        }

        // Process TV platform events here
        const latestSubscriptionHistoryResults =
          await this.userSubscriptionService.getLatestSubscriptionHistoryForTvAdoption(
            message.user_id,
            true,
          );
        if (
          !latestSubscriptionHistoryResults?.giveTvAdoption ||
          !latestSubscriptionHistoryResults.latestSubscriptionHistory
        ) {
          this.logger.log(
            { userId: message.user_id },
            `User is not eligible for TV adoption extension as per latest subscription history`,
          );
          continue;
        }

        // Get TV adoption flow from Statsig experiment
        const isEligibleForTrialExtension =
          await this.checkTvAdoptionFlowExperiment(message.user_id);
        if (!isEligibleForTrialExtension) {
          this.logger.log(
            { userId: message.user_id },
            `User is not eligible for TV adoption extension as per TV adoption flow experiment`,
          );
          continue;
        }

        // Give TV adoption to trial user
        await this.processTvAdoptionForTrialUser(
          message.user_id,
          latestSubscriptionHistoryResults.latestSubscriptionHistory,
          redisKey,
          tvAdoptionData,
        );
      } catch (error) {
        this.logger.error(
          { error, userId: message.user_id },
          `Error processing TV adoption for user`,
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

    // if (!APP_CONFIGS.KAFKA.WATCHED_VIDEO_SECONDARY_CONSUMER_ENABLED) {
    //   this.logger.log(
    //     `Watched video secondary consumer is disabled. Skipping subscription to Kafka topic ${this.TOPIC}`,
    //   );
    //   return;
    // }

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
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_WATCHED_VIDEO_TV_ADOPTION,
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
