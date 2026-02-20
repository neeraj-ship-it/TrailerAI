import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';

import { AUTO_TIME_OF_DAY_BIN } from '../constants/constants';
import {
  WVEvent,
  XRoadMediaUserInteractionData,
  NcantoInteraction,
  NcantoEntityLevel,
} from '../interfaces/ncanto.interfaces';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { NcantoAssetType } from '@app/common/interfaces/ncantoAsset.interface';
import { CommonUtils } from '@app/common/utils/common.utils';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { NcantoPanel } from 'common/enums/common.enums';
import { EpisodeType } from 'src/content/entities/episodes.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';
@Injectable()
export class UserWatchedVideoConsumerService
  implements OnModuleInit, OnModuleDestroy, BatchHandler<WVEvent>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserWatchedVideoConsumerService.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.WATCHED_VIDEO_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    @Inject() private episodeRepository: EpisodesRepository,
    @Inject() private readonly ncantoUtils: NcantoUtils,
  ) {}

  private calculateRating(
    consumedDuration: number,
    totalDuration: number,
    eventType: string,
  ): number {
    // Validate inputs to prevent division by zero and invalid calculations
    if (
      !Number.isFinite(consumedDuration) ||
      !Number.isFinite(totalDuration) ||
      totalDuration <= 0
    ) {
      return -0.1; // Return default rating for invalid inputs
    }

    if (eventType !== NcantoInteraction.PLAY) {
      const percentageWatched = (consumedDuration / totalDuration) * 100;
      const rating = ((percentageWatched - 10) * 1.1) / 100;

      // Ensure the result is a valid finite number and clamp to expected range
      if (!Number.isFinite(rating)) {
        return -0.1;
      }

      // Clamp rating to range [-0.1, 1.0] to prevent Ncanto API constraint violation
      return Math.max(-0.1, Math.min(1.0, rating));
    }
    return -0.1; // or handle other event types differently
  }

  async handleBatch(messages: WVEvent[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    const missingContentMap = new Map<string, number>();

    try {
      for (const message of messages) {
        const episode = await this.episodeRepository.findById(
          message.content_id,
          ['title', 'slug', 'type', 'showSlug'],
          {
            cache: { enabled: true },
            lean: true,
          },
        );
        if (!episode) {
          this.logger.error(
            `Episode not found for content_id: ${message.content_id}`,
          );
          const currentCount = missingContentMap.get(message.content_id) || 0;
          missingContentMap.set(message.content_id, currentCount + 1);
          continue;
        } else {
          const isSubscriber = await this.ncantoUtils.checkSubscription(
            message.user_id,
          );
          if (!isSubscriber) continue;

          const event: XRoadMediaUserInteractionData = {
            assetId: `${episode?.slug}_${message.content_type === EpisodeType.Movie ? NcantoAssetType.MOVIE : NcantoAssetType.EPISODE}`,
            contextId: message.source_widget,
            interaction:
              message.event_type === 'play'
                ? NcantoInteraction.PLAY_START
                : NcantoInteraction.PLAY,
            panelId: NcantoPanel.StageHome,
            positionSeconds: message.consumed_duration,
            profile: `${message.user_id}_default`,
            ratingEquivalent: this.calculateRating(
              message.consumed_duration,
              message.total_duration,
              message.event_type,
            ),
            setting: {
              autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
              device: message.os,
              locationBin: message.city,
            },
            ...this.ncantoUtils.checkBlacklistContent(
              message.event_type === 'play'
                ? NcantoInteraction.PLAY_START
                : NcantoInteraction.PLAY,
              message.content_type === EpisodeType.Movie
                ? NcantoEntityLevel.MOVIE
                : NcantoEntityLevel.SERIES,
              message.consumed_duration,
              message.total_duration,
            ),
            subscriber: message.user_id,
            timestamp: CommonUtils.formatTimestampToIndianTimeZone(
              message.timestamp,
            ),
          };
          this.ncantoUtils.logInteraction(
            [event],
            messages.length,
            message.event_type === 'play'
              ? NcantoInteraction.PLAY_START
              : NcantoInteraction.PLAY,
            missingContentMap,
          );
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        { error },
        `Critical error processing userwatchedvideo batch.`,
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
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_WATCHED_VIDEO,
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
