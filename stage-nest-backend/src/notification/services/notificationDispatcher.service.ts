import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';

import { Queue } from 'bullmq';

import { json } from 'typia';

import { NotificationPayload } from '../interfaces/notificationPayload.interface';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async dispatchNotification(payload: NotificationPayload) {
    return this.errorHandlerService.try(
      async () => {
        await this.notificationsQueue.add(payload.key, payload);
        this.logger.debug(
          `Dispatched job with payload ${json.stringify(payload)}`,
        );
      },
      (error) => {
        this.logger.error(
          { error },
          `Error registering notification on the queue`,
        );
      },
    );
  }
}
