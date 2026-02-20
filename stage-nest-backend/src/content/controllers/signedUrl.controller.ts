import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, Param } from '@nestjs/common';

import type {
  GetBatchSignedUrlRequestDto,
  GetSignedUrlQueryDto,
  GetSpecialAccessSignedUrlRequestDto,
} from '../dto/signedUrl.request.dto';
import type {
  BatchSignedUrlWrappedResponseDto,
  SignedUrlResponseDto,
  SpecialAccessSignedUrlResponseDto,
} from '../dto/signedUrl.response.dto';
import { SignedUrlService } from '../services/signedUrl.service';
import { Internal } from '@app/auth';

@Controller()
export class SignedUrlController {
  constructor(private readonly signedUrlService: SignedUrlService) {}

  @TypedRoute.Post('bulk-signed-url')
  async getBatchSignedUrl(
    @TypedBody() body: GetBatchSignedUrlRequestDto,
  ): Promise<BatchSignedUrlWrappedResponseDto> {
    return {
      data: await this.signedUrlService.getBatchSignedUrls(body),
    };
  }

  @TypedRoute.Get(':episodeId/signedUrl')
  @Internal()
  async getSignedUrl(
    @Param('episodeId') episodeId: string,
    @TypedQuery() query: GetSignedUrlQueryDto,
  ): Promise<SignedUrlResponseDto> {
    return this.signedUrlService.getSignedUrl({
      ...query,
      episodeId,
    });
  }

  @TypedRoute.Get('special-access/signedUrl')
  async getSignedUrlV2(
    @TypedQuery() query: GetSpecialAccessSignedUrlRequestDto,
  ): Promise<SpecialAccessSignedUrlResponseDto> {
    return {
      data: await this.signedUrlService.getSignedUrlV2(query),
      responseMessage: 'Success',
    };
  }
}
