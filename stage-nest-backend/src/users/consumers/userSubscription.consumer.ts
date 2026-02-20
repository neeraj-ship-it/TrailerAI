import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { StatsigService } from '../services/statsig.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { RedisService } from '@app/redis';
interface IUserMessage {
  eventType: string;
  profileId?: string;
  profileName?: string;
  subscriptionValid: Date;
  userId: string;
  vendor: string;
}

@Injectable()
export class UserSubscriptionConsumer
  implements OnModuleInit, OnModuleDestroy, BatchHandler<IUserMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(UserSubscriptionConsumer.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.USER_SUBSCRIPTION_CHANGES_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly ncantoUtils: NcantoUtils,
    private readonly redisService: RedisService,
    private readonly statsigService: StatsigService,
  ) {}

  async handleBatch(messages: IUserMessage[]): Promise<boolean> {
    if (messages.length === 0) {
      return true;
    }

    this.logger.log(
      `Processing user metadata batch with ${messages.length} messages`,
    );

    try {
      for (const message of messages) {
        this.ncantoUtils.checkSubscription(message.userId, true);
        this.statsigService.refreshStatsigUser(message.userId);
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing usersubscription batch ${error}`,
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
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_USER_CHANGES,
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
