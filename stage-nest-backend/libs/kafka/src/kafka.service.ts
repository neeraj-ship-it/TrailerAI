import { Injectable, Logger } from '@nestjs/common';
import { Consumer, EachBatchPayload, Kafka, Producer } from 'kafkajs';

import {
  type KafkaConfig,
  KafkaConsumerConfig,
  KafkaMessage,
} from './interfaces/kafka-config.interface';
import { BatchHandler } from './interfaces/kafka-handler.interface';
import { ErrorHandlerService } from '@app/error-handler';
import { APP_CONFIGS } from 'common/configs/app.config';
@Injectable()
export class KafkaService {
  private consumers = new Map<string, Consumer>();
  private readonly disabled: boolean;
  private flushIntervals = new Map<string, NodeJS.Timeout>();
  private kafka: Kafka | null = null;
  private readonly logger = new Logger(KafkaService.name);
  private messageBuffers = new Map<string, unknown[]>();
  private processingFlags = new Map<string, boolean>();
  private producer: Producer | null = null;

  constructor(
    private readonly config: KafkaConfig,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.disabled = APP_CONFIGS.IS_TEST || !APP_CONFIGS.KAFKA.ENABLED;

    if (this.disabled) {
      this.logger.log(
        'Kafka is disabled (KAFKA_ENABLED=false or IS_TEST=true), skipping client initialization',
      );
      return;
    }

    this.kafka = new Kafka({
      brokers: config.brokers,
      clientId: config.clientId,
      connectionTimeout: config.connectionTimeout || 10000,
      retry: config.retry || { initialRetryTime: 5000, retries: 3 },
    });

    this.producer = this.kafka.producer();
  }

  private async flushMessageBuffer(
    topic: string,
    handler: BatchHandler<unknown>,
  ) {
    const buffer = this.messageBuffers.get(topic) || [];
    if (buffer.length === 0) return;

    const messages = [...buffer];
    this.messageBuffers.set(topic, []);

    // Set processing flag to true
    this.processingFlags.set(topic, true);

    try {
      const [response, error] = await this.errorHandler.try(() => {
        return handler.handleBatch(messages);
      });
      if (error) {
        this.logger.error(`Error processing batch: ${error}`);
      }
      return response;
    } finally {
      // Always reset processing flag when done
      this.processingFlags.set(topic, false);
    }
  }

  async connect(): Promise<void> {
    if (this.disabled || !this.producer) {
      return;
    }

    try {
      await this.producer.connect();
      this.logger.log('Successfully connected to Kafka producer');
    } catch (error) {
      this.logger.error(`Failed to connect to Kafka producer: ${error}`);
      // Don't throw error to prevent blocking server startup
      // Kafka will retry connection automatically based on retry config
    }
  }

  async createConsumer(config: KafkaConsumerConfig): Promise<Consumer> {
    // Check if consumer already exists for this group
    const existingConsumer = this.consumers.get(config.groupId);
    if (existingConsumer) {
      this.logger.warn(
        `Consumer for group ${config.groupId} already exists, reusing existing consumer`,
      );
      return existingConsumer;
    }

    const consumer = this.kafka!.consumer({
      groupId: config.groupId,
      heartbeatInterval: 3000,
      // Add session timeout to prevent coordinator issues
      sessionTimeout: 30000,
    });

    this.consumers.set(config.groupId, consumer);
    this.logger.log(`Created new consumer for group ${config.groupId}`);
    return consumer;
  }

  async disconnect(): Promise<void> {
    // Skip disconnect if Kafka was never connected
    if (this.disabled || !this.producer) {
      return;
    }

    await Promise.all([
      this.producer.disconnect(),
      ...Array.from(this.consumers.values()).map((consumer) =>
        consumer.disconnect(),
      ),
    ]);

    // Clear all flush intervals
    this.flushIntervals.forEach((interval) => clearInterval(interval));
    this.flushIntervals.clear();
    this.messageBuffers.clear();
    this.consumers.clear();
  }

  async produce<T>(topic: string, messages: KafkaMessage<T>[]) {
    if (this.disabled || !this.producer) {
      return;
    }

    const [response, error] = await this.errorHandler.try(() => {
      return this.producer!.send({
        messages: messages.map((msg) => ({
          headers: msg.headers,
          key: msg.key,
          partition: msg.partition,
          value: JSON.stringify(msg.value),
        })),
        topic,
      });
    });
    if (error) {
      this.logger.error(
        `Failed to produce messages to topic ${topic} with error ${error}`,
      );
    }
    return response;
  }

  async subscribe<T>(
    topic: string,
    config: KafkaConsumerConfig,
    handler: BatchHandler<T>,
  ): Promise<void> {
    if (this.disabled) {
      return;
    }

    // Check if Kafka consumers are disabled via environment variable
    if (!APP_CONFIGS.KAFKA.CONSUMERS_ENABLED) {
      this.logger.log(
        `Kafka consumers are disabled for topic ${topic} KAFKA_CONSUMERS_ENABLED=${APP_CONFIGS.KAFKA.CONSUMERS_ENABLED}`,
      );
      return;
    }
    this.logger.log(
      `Kafka consumers are enabled for topic ${topic} KAFKA_CONSUMERS_ENABLED=${APP_CONFIGS.KAFKA.CONSUMERS_ENABLED}`,
    );

    const consumer = await this.createConsumer(config);
    const batchSize = config.batchSize || 100;
    const flushInterval = config.flushInterval || 10000;

    this.messageBuffers.set(topic, []);
    this.processingFlags.set(topic, false);

    try {
      await consumer.connect();
      await consumer.subscribe({
        fromBeginning: config.fromBeginning ?? false,
        topic,
      });

      // Set up flush interval
      const intervalId = setInterval(async () => {
        // Only flush if not currently processing
        if (!this.processingFlags.get(topic)) {
          await this.flushMessageBuffer(topic, handler);
        }
      }, flushInterval);
      this.flushIntervals.set(topic, intervalId);

      await consumer.run({
        autoCommit: true,
        autoCommitInterval: 1000,
        autoCommitThreshold: 100,
        eachBatch: async (payload: EachBatchPayload) => {
          const { batch, isRunning, isStale } = payload;

          // Pause consumer to prevent fetching new messages
          await consumer.pause([{ topic }]);

          try {
            for (const message of batch.messages) {
              if (!isRunning() || isStale()) break;

              const value = message.value?.toString();
              if (!value) continue;

              try {
                const parsedValue = JSON.parse(value);
                const buffer = this.messageBuffers.get(topic) || [];
                buffer.push(parsedValue);

                if (buffer.length >= batchSize) {
                  await this.flushMessageBuffer(topic, handler);
                }
              } catch (error) {
                this.logger.warn(
                  `Failed to parse message from topic ${topic}: ${error}`,
                );
              }
            }

            // Process any remaining messages in buffer
            if (!this.processingFlags.get(topic)) {
              await this.flushMessageBuffer(topic, handler);
            }
          } finally {
            // Resume consumer to allow fetching new messages
            await consumer.resume([{ topic }]);
          }
        },
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}: ${error}`);
      this.flushIntervals.delete(topic);
      this.messageBuffers.delete(topic);
      this.processingFlags.delete(topic);
      this.consumers.delete(config.groupId);
      // Don't throw error to prevent blocking server startup
      // The consumer will remain disconnected and can be retried later
    }
  }
}
