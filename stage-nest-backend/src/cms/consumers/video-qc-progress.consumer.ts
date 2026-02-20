import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { VideoQcRequestedEvent } from '../dtos/kafka-events.dto';
import { TaskExecutionService } from '../services/task-execution.service';
import { VideoQcService } from '../services/video-qc.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService } from '@app/error-handler';
import { BatchHandler, KafkaService } from '@app/kafka';

@Injectable()
export class VideoQcProgressConsumer
  implements OnModuleInit, OnModuleDestroy, BatchHandler<VideoQcRequestedEvent>
{
  private readonly logger = new Logger(VideoQcProgressConsumer.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.CMS_VIDEO_QC_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly videoQcService: VideoQcService,
    private readonly taskExecutionService: TaskExecutionService,
  ) {}

  async handleBatch(messages: VideoQcRequestedEvent[]): Promise<boolean> {
    const [result, error] = await this.errorHandler.try(
      async () => {
        // With batchSize: 1, messages array should only contain 1 message

        this.logger.log({ messages }, 'Executing video QC tasks');
        for (const message of messages) {
          await this.taskExecutionService.executeVideoQcTask(message);
        }
        return true;
      },
      (error) => {
        this.logger.error(
          { error, messageCount: messages.length },
          'Failed processing video QC progress batch',
        );
      },
    );

    return error ? false : (result ?? false);
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.IS_TEST) {
      this.logger.log(
        'Skipping Kafka consumer initialization in test environment',
      );
      return;
    }

    if (!APP_CONFIGS.KAFKA.CONSUMERS_ENABLED) {
      this.logger.warn(
        `Kafka consumers are disabled. Set KAFKA_CONSUMERS_ENABLED=true to enable. Topic: ${this.TOPIC}`,
      );
      return;
    }

    this.logger.log(
      `Initializing Kafka consumer for topic ${this.TOPIC} with group ${APP_CONFIGS.KAFKA.GROUP_ID_CMS_VIDEO_QC_PROGRESS}`,
    );

    this.kafkaService
      .connect()
      .then(() => {
        this.logger.log('Connected to Kafka producer');
        this.kafkaService
          .subscribe(
            this.TOPIC,
            {
              batchSize: 1, // Process one message at a time
              brokers: APP_CONFIGS.KAFKA.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              flushInterval: 10_000,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_CMS_VIDEO_QC_PROGRESS,
            },
            this,
          )
          .then(() => {
            this.logger.log(
              `Successfully subscribed to Kafka topic ${this.TOPIC} for QC progress with consumer group ${APP_CONFIGS.KAFKA.GROUP_ID_CMS_VIDEO_QC_PROGRESS}`,
            );
          });
      })
      .catch((error) => {
        this.logger.error(
          {
            error,
            groupId: APP_CONFIGS.KAFKA.GROUP_ID_CMS_VIDEO_QC_PROGRESS,
            topic: this.TOPIC,
          },
          'Failed to initialize Kafka consumer for video QC progress',
        );
        // Don't throw error to prevent blocking server startup
      });
  }
}
