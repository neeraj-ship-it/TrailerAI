import { Injectable, Logger, Optional } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
  CMSQueueKeys,
  DriveUploadPayload,
} from '../interfaces/queue-payloads.interface';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class CmsJobDispatcher {
  private readonly logger = new Logger(CmsJobDispatcher.name);
  constructor(
    @InjectQueue(QUEUES.CMS_CONTENT)
    private readonly contentQueue: Queue,
    @Optional()
    @InjectQueue(QUEUES.CMS_UPLOAD)
    private readonly uploadQueue: Queue | null,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async dispatchDriveUploadJob(
    uploadPayload: DriveUploadPayload,
    fileId: string,
    rawMediaId: string,
  ): Promise<void> {
    const uploadQueue = this.uploadQueue;
    if (!uploadQueue) {
      this.logger.warn(
        `Upload worker is disabled. Skipping upload job for file ${fileId}, rawMediaId: ${rawMediaId}`,
      );
      return;
    }

    await this.errorHandlerService.try(
      async () => {
        await uploadQueue.add(CMSQueueKeys.DRIVE_UPLOAD, uploadPayload, {
          attempts: 0,
          backoff: {
            delay: 2000,
            type: 'exponential',
          },
          jobId: `drive-upload-${fileId}-${rawMediaId}`,
          removeOnComplete: 10,
          removeOnFail: 100,
        });
        this.logger.log(
          `Dispatched upload job for file ${fileId}, rawMediaId: ${rawMediaId}`,
        );
      },
      (error) => {
        this.logger.error(
          { error },
          `Error dispatching drive upload job for file ${fileId}`,
        );
      },
    );
  }

  async dispatchJob(key: string) {
    return this.errorHandlerService.try(
      async () => {
        await this.contentQueue.add(
          QUEUES.CMS_CONTENT,
          {
            key,
          },
          { removeOnComplete: 1000 },
        );
        this.logger.debug(`Dispatched cms job with key:${key}`);
      },
      (error) => {
        this.logger.error({ error }, `Error dispatching job to cms queue`);
      },
    );
  }
}
