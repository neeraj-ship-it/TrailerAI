import { WorkerHost } from '@nestjs/bullmq';
import { Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import {
  CMSQueuePayload,
  DriveUploadData,
} from '../interfaces/queue-payloads.interface';
import { CMSQueueKeys } from '../interfaces/queue-payloads.interface';
import { ExternalFileManagerService } from '../services/external-file-manager.service';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler';

@Processor(QUEUES.CMS_UPLOAD, {
  concurrency: 1,
})
export class CmsDriveUploadHandlerWorker extends WorkerHost {
  private readonly logger = new Logger(CmsDriveUploadHandlerWorker.name);

  constructor(
    @Inject() private readonly errorHandlerService: ErrorHandlerService,
    private readonly externalFileManagerService: ExternalFileManagerService,
  ) {
    super();
  }

  private async handleDriveUpload(payload: DriveUploadData): Promise<void> {
    const { bucket, fileId, filePath, mimeType, rawMediaId, size } = payload;

    this.logger.log(
      `Starting upload for file ${fileId}, rawMediaId: ${rawMediaId}`,
    );

    await this.externalFileManagerService.processDriveUpload({
      bucket,
      fileId,
      filePath,
      mimeType,
      rawMediaId,
      size,
    });
  }

  async process({ data }: Job<CMSQueuePayload>) {
    return this.errorHandlerService.try(async () => {
      if (data.key === CMSQueueKeys.DRIVE_UPLOAD) {
        // Ensure the upload completes before the job is marked as done
        await this.handleDriveUpload(data.payload);
        return;
      }
      this.logger.warn(`Unknown queue key: ${(data as { key: string }).key}`);
    });
  }
}
