import { Injectable, Logger } from '@nestjs/common';

import { ObjectId } from '@mikro-orm/mongodb';

import { RawMediaRepository } from '../repositories/raw-media.repository';
import { GoogleDriveService } from './google-drive.service';
import { ErrorHandlerService } from '@app/error-handler';
import { S3Service } from '@app/storage';
import { MediaStatusEnum, RawMedia } from 'common/entities/raw-media.entity';

@Injectable()
export class ExternalFileManagerService {
  private readonly logger = new Logger(ExternalFileManagerService.name);

  constructor(
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly s3Service: S3Service,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  private async updateRawMediaStatus({
    rawMediaId,
    status,
    uploadProgress,
  }: {
    rawMediaId: string;
    status: MediaStatusEnum;
    uploadProgress?: number;
  }): Promise<void> {
    const forkedEm = this.rawMediaRepository.getEntityManager().fork();
    const rawMedia = await forkedEm.findOneOrFail(RawMedia, {
      _id: new ObjectId(rawMediaId),
    });

    if (uploadProgress !== undefined) {
      rawMedia.uploadProgress = uploadProgress;
    }

    if (status !== rawMedia.status) {
      rawMedia.status = status;
    }

    await forkedEm.persistAndFlush(rawMedia);
  }

  async processDriveUpload(uploadData: {
    fileId: string;
    rawMediaId: string;
    bucket: string;
    filePath: string;
    mimeType: string;
    size: number;
  }): Promise<void> {
    const { bucket, fileId, filePath, mimeType, rawMediaId, size } = uploadData;

    this.logger.log(
      `Processing drive upload for file ${fileId}, rawMediaId: ${rawMediaId}`,
    );

    await this.errorHandlerService
      .try(async () => {
        const streamResult =
          await this.googleDriveService.getFileReadableStream(fileId);

        const { stream } = streamResult;
        let lastProgressUpdate = 0;

        await this.s3Service.uploadFileStream({
          bucket,
          filePath,
          mimeType,
          size,
          stream,
          uploadProgress: async (progress: number) => {
            if (
              progress - lastProgressUpdate < 5 &&
              progress !== 100 &&
              progress !== 0
            )
              return;

            await this.updateRawMediaStatus({
              rawMediaId,
              status:
                progress === 100
                  ? MediaStatusEnum.UPLOAD_COMPLETED
                  : MediaStatusEnum.UPLOADING,
              uploadProgress: progress,
            });
            lastProgressUpdate = progress;

            // Log progress update
            this.logger.log(
              `Upload progress for file ${fileId} (rawMediaId: ${rawMediaId}): ${progress}%`,
            );
          },
        });

        await this.updateRawMediaStatus({
          rawMediaId,
          status: MediaStatusEnum.UPLOAD_COMPLETED,
        });
      })
      .catch(async (error) => {
        this.logger.error(
          { error },
          `File upload failed for ${fileId}, rawMediaId: ${rawMediaId}`,
        );

        await this.errorHandlerService.try(async () => {
          await this.updateRawMediaStatus({
            rawMediaId,
            status: MediaStatusEnum.UPLOAD_FAILED,
          });
        });
      });
  }
}
