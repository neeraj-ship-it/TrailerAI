import { Injectable, Logger } from '@nestjs/common';

import {
  AwsMediaConvertJobStateChangePayloadDto,
  AwsTranscribeJobStateChangePayloadDto,
  MEDIACONVERT_JOB_STATUS,
} from '../dtos/aws-webhook.dto';
import { ContentService } from './content.service';
import { MediaSubtitleService } from './media-subtitle.service';
import { TaskStatusEnum } from 'common/entities/raw-media.entity';

@Injectable()
export class AwsCmsWebhookService {
  private readonly logger = new Logger(AwsCmsWebhookService.name);
  constructor(
    private readonly mediaSubtitleService: MediaSubtitleService,
    private readonly contentService: ContentService,
  ) {}

  //handle transcode mp4 callback
  public async handleMediaConvertJobUpdate(
    event: AwsMediaConvertJobStateChangePayloadDto,
  ): Promise<void> {
    if (event.detail.status === MEDIACONVERT_JOB_STATUS.COMPLETE) {
      await this.contentService.updateRawMediaMp4Status(
        event.detail.outputGroupDetails[0].outputDetails[0].outputFilePaths[0],
        event.detail.jobId,
        TaskStatusEnum.COMPLETED,
      );
      const url =
        event.detail.outputGroupDetails[0].outputDetails[0].outputFilePaths[0];
      const durationInMs =
        event.detail.outputGroupDetails[0].outputDetails[0].durationInMs;
      return this.contentService.handleUpdateEpisodeDurationFromMediaConvert({
        durationInMs,
        url,
      });
    } else {
      this.logger.log(
        `Received AWS MediaConvert job update, but status is not complete: ${JSON.stringify(event.detail.status)}`,
      );
    }
  }

  public async handleTranscribeJobUpdate(
    event: AwsTranscribeJobStateChangePayloadDto,
  ): Promise<void> {
    this.logger.log(
      `Received AWS Transcribe job update, delegating to MediaSubtitleService: ${JSON.stringify(event.detail.TranscriptionJobName)}`,
    );
    this.mediaSubtitleService.processTranscriptionWebhook(event);
  }
}
