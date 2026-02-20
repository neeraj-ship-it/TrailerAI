import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ObjectId } from '@mikro-orm/mongodb';

import { AUTO_TIME_OF_DAY_BIN } from '../constants/constants';
import {
  XRoadMediaUserInteractionData,
  NcantoInteraction,
} from '../interfaces/ncanto.interfaces';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { CommonUtils } from '@app/common/utils/common.utils';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { NcantoPanel } from 'common/enums/common.enums';
import { NcantoAssetType } from 'common/interfaces/ncantoAsset.interface';
import { MasterMandateRepository } from 'common/repositories/masterMandate.repository';
import { UserRepository } from 'common/repositories/user.repository';
import { EpisodeType } from 'src/content/entities/episodes.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';

interface IUserMessage {
  isTrial: boolean;
  mandateOrderId: string;
  masterMandateId: string;
  userId: string;
  vendor: string;
}

@Injectable()
export class UserTrialActivatedConsumer
  implements OnModuleInit, OnModuleDestroy, BatchHandler<IUserMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserTrialActivatedConsumer.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.USER_SUBSCRIPTION_CHANGES_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly ncantoUtils: NcantoUtils,
    private readonly masterMandateRepository: MasterMandateRepository,
    private readonly usersRepository: UserRepository,
    private readonly episodeRepository: EpisodesRepository,
  ) {}

  private getAssetId(
    contentSlug: string,
    episodeSlug?: string,
    episodeType?: EpisodeType,
  ): string {
    if (!episodeSlug) {
      return `${contentSlug}_${NcantoAssetType.SHOW}`;
    }
    return `${contentSlug}_${episodeType === EpisodeType.Movie ? NcantoAssetType.MOVIE : NcantoAssetType.SHOW}`;
  }

  async handleBatch(messages: IUserMessage[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    this.logger.log(
      `Processing trial activated batch with ${messages.length} messages`,
    );

    try {
      for (const message of messages) {
        if (!message.userId) {
          this.logger.warn(
            `Skipping message without userId: ${JSON.stringify(message)}`,
          );
          continue;
        }
        if (
          message.vendor !== PaymentGatewayEnum.PHONEPE &&
          message.vendor !== PaymentGatewayEnum.PAYTM &&
          !message.isTrial
        ) {
          this.logger.warn(
            `Skipping message with vendor and isTrial: ${message.vendor} and ${message.isTrial}`,
          );
          continue;
        }

        const userId = message.userId;

        this.logger.debug(`Processing trial activated for user: ${userId}`);

        // Ensure subscriber is set up in ncanto when trial is activated
        // This will create/update the subscriber profile in ncanto
        const isSubscriber = await this.ncantoUtils.checkSubscription(userId);

        if (!isSubscriber) {
          this.logger.warn(
            `User ${userId} is not a subscriber, skipping ncanto interaction`,
          );
          continue;
        }
        const user = await this.usersRepository.findById(userId);
        const masterMandate = await this.masterMandateRepository.findOne({
          user: new ObjectId(userId),
        });
        if (!masterMandate) {
          this.logger.warn(
            `User ${userId} does not have a master mandate, skipping ncanto interaction`,
          );
          continue;
        }

        const contentSlug = masterMandate.eventProperties?.content_ids[0];
        if (!contentSlug || contentSlug === 'NA' || contentSlug === '') {
          this.logger.warn(
            `User ${userId} does not have a content slug, skipping ncanto interaction`,
          );
          continue;
        }

        //check the content slug if it is a movie or not for makeing assetId for ncanto
        const episode = await this.episodeRepository.findOne({
          slug: contentSlug,
        });
        const assetId = this.getAssetId(
          contentSlug,
          episode?.slug,
          episode?.type,
        );

        // Create interaction data for ncanto
        const event: XRoadMediaUserInteractionData = {
          assetId,
          contextId: 'MO_PlatterTrials',
          interaction: NcantoInteraction.ACQUIRED,
          panelId: NcantoPanel.StageHome,
          profile: `${userId}_default`,
          ratingEquivalent: 0.75,
          setting: {
            autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
            device: masterMandate?.os,
            locationBin: user?.currentCity ?? undefined,
          },
          subscriber: userId,
          timestamp: CommonUtils.formatTimestampToIndianTimeZone(new Date()),
        };

        // Send all interactions to ncanto in a batch

        await this.ncantoUtils.logInteraction(
          [event],
          messages.length,
          NcantoInteraction.ACQUIRED,
          new Map<string, number>(),
        );
        this.logger.log(`Successfully logged interaction for user: ${userId}`);
      }
      this.logger.log(
        `Successfully processed trial activated batch with ${messages.length} messages`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        { error },
        `Critical error processing trial activated batch`,
      );
      return false;
    }
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.ENV === 'test') {
      return;
    }

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
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_USER_TRIAL_ACTIVATED,
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
