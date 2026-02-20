import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { BatchHandler, KafkaService } from '@app/kafka';
import { ContentType, ContentTypeV2 } from 'common/enums/common.enums';
import { PreviewContentCohortUpdateEvent } from 'src/cms/dtos/kafka-events.dto';
import { ContentProfileService } from 'src/content/services/contentProfile.service';

@Injectable()
export class PreviewContentEventConsumerService
  implements
    OnModuleInit,
    OnModuleDestroy,
    BatchHandler<PreviewContentCohortUpdateEvent>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(PreviewContentEventConsumerService.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.PREVIEW_CONTENT;

  constructor(
    private readonly kafkaService: KafkaService,
    @Inject() private contentProfileService: ContentProfileService,
  ) {}

  async handleBatch(
    messages: PreviewContentCohortUpdateEvent[],
  ): Promise<boolean> {
    if (messages.length === 0) return true;

    this.logger.log(
      `Processing preview content cohort change event batch with ${messages.length} messages`,
    );

    messages.forEach((message) => {
      const contentType =
        message.contentType === ContentTypeV2.MOVIE
          ? ContentType.MOVIE
          : ContentType.SHOW;
      this.contentProfileService.resetCohortUserPreviewContentLikes(
        message.userIds,
        contentType,
        message.dialect,
        message.contentSlug,
      );
    });

    return true;
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.IS_TEST) return;

    this.kafkaService
      .connect()
      .then(() => {
        this.kafkaService
          .subscribe(
            this.TOPIC,
            {
              brokers: this.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_PREVIEW_CONTENT,
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
