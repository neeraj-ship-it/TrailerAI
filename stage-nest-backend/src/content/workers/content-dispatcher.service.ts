import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class ContentJobDispatcher {
  private readonly logger = new Logger(ContentJobDispatcher.name);
  constructor(
    @InjectQueue(QUEUES.CONTENTS)
    private readonly contentQueue: Queue,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async dispatchJob(key: string) {
    return this.errorHandlerService.try(
      async () => {
        await this.contentQueue.add(
          QUEUES.CONTENTS,
          {
            key,
          },
          { removeOnComplete: 1000 },
        );
        this.logger.debug(`Dispatched content job with key:${key}`);
      },
      (error) => {
        this.logger.error({ error }, `Error dispatching job to content queue`);
      },
    );
  }
}
