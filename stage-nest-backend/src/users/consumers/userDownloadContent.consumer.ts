import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { EpisodesRepository } from '../../content/repositories/episode.repository';
import { OnboardingService } from '../../content/services/onboarding.service';
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
@Injectable()
export class UserDownloadContentConsumer
  implements OnModuleInit, OnModuleDestroy, BatchHandler<UserInteractionEvent>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserDownloadContentConsumer.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.DOWNLOAD_STARTED_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly onboardingService: OnboardingService,
    private readonly episodeRepository: EpisodesRepository,
    private readonly ncantoUtils: NcantoUtils,
  ) {}

  private getAssetId(slug: string, contentType: string): string {
    return `${slug}_${contentType === 'film' ? NcantoAssetType.MOVIE : NcantoAssetType.EPISODE}`;
  }

  async handleBatch(messages: UserInteractionEvent[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }
    const missingContentMap = new Map<string, number>();

    try {
      for (const message of messages) {
        const isSubscriber = await this.ncantoUtils.checkSubscription(
          message.user_id,
        );
        if (!isSubscriber) continue;

        const episode = await this.episodeRepository.findById(
          message.content_id,
          ['showId', 'title', 'language', 'displayLanguage', 'slug', 'type'],
          {
            cache: { enabled: true },
            lean: true,
          },
        );
        if (!episode) {
          const currentCount = missingContentMap.get(message.content_id) || 0;
          missingContentMap.set(message.content_id, currentCount + 1);
          continue;
        } else {
          const event: XRoadMediaUserInteractionData = {
            assetId: this.getAssetId(episode.slug, message.content_type),
            contextId: message.source_widget,
            interaction: NcantoInteraction.DOWNLOAD,
            panelId: NcantoPanel.StageHome,
            profile: `${message.user_id}_default`,
            ratingEquivalent: 0.5,
            setting: {
              autoTimeOfDayBin: AUTO_TIME_OF_DAY_BIN,
              device: message.os ?? undefined,
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
            NcantoInteraction.DOWNLOAD,
            missingContentMap,
          );
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing userdownloadcontent batch ${error}`,
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
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_DOWNLOAD_STARTED,
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
