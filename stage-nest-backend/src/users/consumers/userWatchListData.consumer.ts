import {
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { OnboardingService } from '../../content/services/onboarding.service';
import { AUTO_TIME_OF_DAY_BIN } from '../constants/constants';
import {
  UserWatchListData,
  XRoadMediaUserInteractionData,
  NcantoInteraction,
} from '../interfaces/ncanto.interfaces';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { NcantoAssetType } from '@app/common/interfaces/ncantoAsset.interface';
import { CommonUtils } from '@app/common/utils/common.utils';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { NcantoPanel } from 'common/enums/common.enums';
@Injectable()
export class UserWatchListConsumerService
  implements OnModuleInit, OnModuleDestroy, BatchHandler<UserWatchListData>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserWatchListConsumerService.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.WATCHLIST_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    @Inject() private readonly ncantoUtils: NcantoUtils,
    private readonly onboardingService: OnboardingService,
  ) {}

  async handleBatch(messages: UserWatchListData[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    this.logger.log(
      `Processing user watchlist batch with ${messages.length} messages`,
    );
    try {
      let contentIndex = 0;
      for (const message of messages) {
        this.logger.log(`Processing message for user: ${message.user_id}`);

        const sourceWidget =
          contentIndex >= (message?.source_widgets?.length || 0)
            ? undefined
            : message?.source_widgets?.[contentIndex];
        contentIndex++;

        if (
          (!message?.show_slugs && !message?.movie_slugs) ||
          message.action === 'remove'
        ) {
          continue;
        }

        // Check if this is the user's first watchlist item and give reward
        this.onboardingService.checkAndAddFirstWatchlistReward(message.user_id);

        const isSubscriber = await this.ncantoUtils.checkSubscription(
          message.user_id,
        );
        if (!isSubscriber) continue;
        const createEvent = (
          slug: string,
          type: NcantoAssetType,
        ): XRoadMediaUserInteractionData => ({
          assetId: `${slug}_${type}`,
          contextId: sourceWidget,
          interaction: NcantoInteraction.WATCHLIST,
          panelId: NcantoPanel.StageHome,
          profile: `${message.user_id}_default`,
          ratingEquivalent: 0.5,
          setting: {
            autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
            device: message.os,
            locationBin: message.city,
          },
          subscriber: message.user_id,
          timestamp: CommonUtils.formatTimestampToIndianTimeZone(
            message.time_of_event,
          ),
        });

        if (message?.movie_slugs) {
          for (const movie of message.movie_slugs) {
            this.ncantoUtils.logInteraction(
              [createEvent(movie, NcantoAssetType.MOVIE)],
              messages.length,
              NcantoInteraction.WATCHLIST,
              new Map<string, number>(), // no content filtering here content
            );
          }
        }
        if (message?.show_slugs) {
          for (const show of message.show_slugs) {
            this.ncantoUtils.logInteraction(
              [createEvent(show, NcantoAssetType.SHOW)],
              messages.length,
              NcantoInteraction.WATCHLIST,
              new Map<string, number>(), // no content filtering here content
            );
          }
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing userwatchlist batch ${error}`,
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
              flushInterval: 10000,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_USER_WATCH_LIST,
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
