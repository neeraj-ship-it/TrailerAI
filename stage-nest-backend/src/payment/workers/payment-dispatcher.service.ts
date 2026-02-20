import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class PaymentJobDispatcher {
  private readonly logger = new Logger(PaymentJobDispatcher.name);
  constructor(
    @InjectQueue(QUEUES.PAYMENTS)
    private readonly paymentQueue: Queue,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async dispatchJob(key: string) {
    return this.errorHandlerService.try(
      async () => {
        await this.paymentQueue.add(
          QUEUES.PAYMENTS,
          {
            key,
          },
          { removeOnComplete: 1000 },
        );
        this.logger.debug(`Dispatched payment job with key:${key}`);
      },
      (error) => {
        this.logger.error({ error }, `Error dispatching job to payment queue`);
      },
    );
  }
}
