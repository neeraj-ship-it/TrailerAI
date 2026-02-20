import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Logger } from '@nestjs/common';

import { NotificationPayload } from '../interfaces/notificationPayload.interface';
import { NotificationProcessorService } from './notificationProcessor.service';
import { QUEUES } from '@app/common/constants/queues.const';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);
  constructor(
    private readonly notificationProcessorService: NotificationProcessorService,
  ) {
    super();
  }
  async process({ data }: Job<NotificationPayload>) {
    this.logger.log(
      `Processing job inside ${NotificationConsumer.name}: ${data.key}`,
    );
    return this.notificationProcessorService.sendNotification(data);
  }
}
