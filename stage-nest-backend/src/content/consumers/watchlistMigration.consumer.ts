import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ObjectId } from '@mikro-orm/mongodb';

import {
  ContentProfile,
  WatchListStatus,
} from '../entities/contentProfile.entity';
import { ContentProfileRepository } from '../repositories/contentProfile.repository';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { ContentType } from 'common/enums/common.enums';

interface MigrationMessage {
  userId: string;
  watchListItems: {
    contentSlug: string;
    contentType: ContentType;
  }[];
}

@Injectable()
export class WatchListMigrationConsumer
  implements OnModuleInit, OnModuleDestroy, BatchHandler<MigrationMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;

  private readonly logger = new Logger(WatchListMigrationConsumer.name);

  private readonly TOPIC = APP_CONFIGS.KAFKA.WATCHLIST_MIGRATION;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly contentProfileRepository: ContentProfileRepository,
  ) {}

  async handleBatch(messages: MigrationMessage[]): Promise<boolean> {
    for (const message of messages) {
      try {
        const userId = message.userId;

        if (!userId) {
          this.logger.warn('No userId provided for migration');
          continue;
        }

        const watchListData = message.watchListItems || [];
        this.logger.debug(
          `Processing user ${userId} with ${watchListData.length} watch list items`,
        );

        const forkedContentProfileRepository = this.contentProfileRepository
          .getEntityManager()
          .fork();

        const profileObjectId = new ObjectId(userId);

        let contentProfile = await forkedContentProfileRepository.findOne(
          ContentProfile,
          { _id: profileObjectId },
        );

        if (!contentProfile) {
          this.logger.warn(
            `No content profile found for user ${userId}, creating new one`,
          );
          contentProfile = forkedContentProfileRepository.create(
            ContentProfile,
            {
              _id: profileObjectId,
              likedContent: [],
              userId: profileObjectId,
              watchListContent: [],
            },
          );
        }

        this.logger.debug(`Found existing content profile for user ${userId}`);

        const addWatchListData: WatchListStatus[] =
          watchListData?.map((item) => ({
            contentType: item.contentType,
            slug: item.contentSlug,
          })) || [];

        contentProfile.watchListContent = addWatchListData;
        await forkedContentProfileRepository.persistAndFlush(contentProfile);
        this.logger.debug(
          `Successfully migrated watch list for user ${userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process message for user ${message.userId}:`,
          error,
        );
        // Continue processing other messages instead of failing the entire batch
        continue;
      }
    }

    return true;
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.IS_TEST) {
      return;
    }
    this.kafkaService.connect().then(() => {
      this.logger.log(
        'WatchList Migration Consumer connected to Kafka brokers',
      );
      this.kafkaService
        .subscribe(
          this.TOPIC,
          {
            batchSize: 5,
            brokers: this.BROKERS,
            clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
            flushInterval: 30000,
            fromBeginning: false,
            groupId: APP_CONFIGS.KAFKA.WATCHLIST_GROUP_ID,
          },
          this,
        )
        .then(() => {
          this.logger.log(
            `Successfully subscribed to Kafka topic ${this.TOPIC}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to connect to Kafka brokers on topic ${this.TOPIC}`,
            error,
          );
          // Don't throw error to prevent blocking server startup
        });
    });
  }
}
