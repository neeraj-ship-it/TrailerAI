import {
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { AUTO_TIME_OF_DAY_BIN } from '../constants/constants';
import {
  UserInteractionEvent,
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
import { EpisodeType } from 'src/content/entities/episodes.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';
@Injectable()
export class UserClickEventConsumerService
  implements OnModuleInit, OnModuleDestroy, BatchHandler<UserInteractionEvent>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserClickEventConsumerService.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.THUMBNAIL_CLICKED_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    @Inject() private readonly ncantoUtils: NcantoUtils,
    @Inject() private episodeRepository: EpisodesRepository,
  ) {}

  private getAssetId(
    contentSlug: string,
    episodeSlug?: string,
    episodeType?: EpisodeType,
  ): string {
    if (!episodeSlug) {
      return `${contentSlug}_${NcantoAssetType.SHOW}`;
    }
    return `${contentSlug}_${episodeType === EpisodeType.Movie ? NcantoAssetType.MOVIE : NcantoAssetType.EPISODE}`;
  }

  async handleBatch(messages: UserInteractionEvent[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }
    try {
      for (const message of messages) {
        const isSubscriber = await this.ncantoUtils.checkSubscription(
          message.user_id,
        );
        if (!isSubscriber) continue;
        let episode;
        if (
          message.content_type === 'show' ||
          message.content_type === 'movie'
        ) {
          episode = await this.episodeRepository.findById(
            message.content_id,
            ['title', 'slug', 'type'],
            {
              cache: { enabled: true },
              lean: true,
            },
          );
        }
        const event: XRoadMediaUserInteractionData = {
          assetId: this.getAssetId(
            message.content_slug,
            episode?.slug,
            episode?.type,
          ),
          contextId: message.source_widget,
          interaction: NcantoInteraction.THUMBNAIL_CLICK,
          panelId: NcantoPanel.StageHome,
          profile: `${message.user_id}_default`,
          ratingEquivalent: 0.2,
          setting: {
            autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
            device: message.os,
            locationBin: message.city ?? undefined,
          },
          subscriber: message.user_id,
          timestamp: message.original_timestamp
            ? CommonUtils.formatTimestampToIndianTimeZone(
                message.original_timestamp,
              )
            : CommonUtils.formatTimestampToIndianTimeZone(new Date()),
        };
        this.ncantoUtils.logInteraction(
          [event],
          messages.length,
          NcantoInteraction.THUMBNAIL_CLICK,
          new Map<string, number>(), // no content filtering here content
        );
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing userthumbnailclicked batch ${error}`,
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
        this.logger.log(`Connected to Kafka brokers for topic ${this.TOPIC}`);
        this.kafkaService
          .subscribe(
            this.TOPIC,
            {
              brokers: this.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              flushInterval: 10000,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_THUMBNAIL_CLICKED,
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
