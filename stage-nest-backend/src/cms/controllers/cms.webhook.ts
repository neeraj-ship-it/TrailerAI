import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import type {
  AwsMediaConvertJobStateChangePayloadDto,
  AwsTranscribeJobStateChangePayloadDto,
} from '../dtos/aws-webhook.dto';
import { AwsCmsWebhookService } from '../services/aws-cms-webhook.service';
import { Public } from '@app/auth/decorators/public.decorator';

@Controller('webhook')
export class AwsWebhookController {
  constructor(private readonly awsCmsWebhookService: AwsCmsWebhookService) {}

  @Public()
  @TypedRoute.Post('aws-event-bridge/media-convert')
  async handleMediaConvertWebhook(
    @TypedBody()
    body: AwsMediaConvertJobStateChangePayloadDto,
  ) {
    this.awsCmsWebhookService.handleMediaConvertJobUpdate(body);
  }

  @Public()
  @TypedRoute.Post('aws-event-bridge/transcribe')
  async handleWebhook(
    @TypedBody()
    body: AwsTranscribeJobStateChangePayloadDto,
  ) {
    this.awsCmsWebhookService.handleTranscribeJobUpdate(body);
  }
}
