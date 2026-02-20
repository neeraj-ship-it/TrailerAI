import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';

import {
  IAirbyteMessage,
  IContent,
} from '../../content/interfaces/userWatchData.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { UserWatchDataRepository } from '@app/common/repositories/userWatchData.repository';

@Injectable()
export class UserWatchConsumerService
  implements OnModuleInit, OnModuleDestroy, BatchHandler<IAirbyteMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly KAFKA_TOPIC = APP_CONFIGS.KAFKA.BYW_TOPIC;
  private readonly logger = new Logger(UserWatchConsumerService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly userWatchDataRepository: UserWatchDataRepository,
  ) {}

  private transformContentData(contentsJson: string): IContent[] {
    try {
      const data: IContent[] = JSON.parse(contentsJson);
      return data.map((d) => ({
        _id: d._id,
        contentType: d.contentType,
        dialect: d.dialect,
        rank: d.rank,
        slug: d.slug,
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to parse or transform user watch contents: ${contentsJson}`,
        error,
      );
      return [];
    }
  }

  async handleBatch(messages: IAirbyteMessage[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    this.logger.log(
      `Processing userwatch batch with ${messages.length} messages`,
    );

    try {
      for (const message of messages) {
        if (
          !message?._airbyte_data?.USER_ID ||
          !message?._airbyte_data?.CONTENTS
        ) {
          continue;
        }

        try {
          const userId = new Types.ObjectId(message._airbyte_data.USER_ID);
          const transformedData = this.transformContentData(
            message._airbyte_data.CONTENTS,
          );

          if (transformedData.length > 0) {
            await this.userWatchDataRepository.updateUserWatchData(
              userId,
              transformedData,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing individual message for user ${message._airbyte_data.USER_ID}`,
            error,
          );
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing userwatchdata batch ${error}`,
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
            this.KAFKA_TOPIC,
            {
              brokers: this.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              flushInterval: 30000,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_BYW_TOPIC,
            },
            this,
          )
          .then(() => {
            this.logger.log(
              `Successfully subscribed to Kafka topic ${this.KAFKA_TOPIC}`,
            );
          });
      })
      .catch((error) => {
        this.logger.error(
          { error },
          `Failed to connect to Kafka brokers for topic ${this.KAFKA_TOPIC}`,
        );
        // Don't throw error to prevent blocking server startup
      });
  }
}
