import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import {
  type ContextUser,
  CtxUser,
} from '@app/auth/decorators/context.decorator';

import type { VideoQcProgressEvent } from '../dtos/kafka-events.dto';
import {
  VideoQcProgressResponse,
  type VideoQcEventRequestDto,
  type VideoQcEventResponseDto,
} from '../dtos/video-qc.dto';
import {
  type CompleteMultipartUploadRequest,
  type CreateVideoQcRequest,
  type CreateVideoQcResponse,
  type GetVideoQcByIdResponse,
  type GetVideoQcListRequest,
  type GetVideoQcListResponse,
  type HandleVideoUploadProgressRequest,
} from '../interfaces/video-qc.interface';
import { VideoQcService } from '../services/video-qc.service';
import { Internal, SkipGlobalAuth } from '@app/auth';
import { CMSOrAdminGuard } from '@app/auth/guards/cms-or-admin.guard';

@Controller('video-qc')
@UseGuards(CMSOrAdminGuard)
@SkipGlobalAuth()
export class VideoQcController {
  constructor(private readonly videoQcService: VideoQcService) {}

  @TypedRoute.Post('complete-multipart-upload')
  async completeMultipartUpload(
    @TypedBody() body: CompleteMultipartUploadRequest,
  ): Promise<void> {
    return this.videoQcService.completeMultipartUpload(body);
  }

  @TypedRoute.Post()
  async createVideoQc(
    @CtxUser() ctx: ContextUser,
    @TypedBody() body: CreateVideoQcRequest,
  ): Promise<CreateVideoQcResponse> {
    return this.videoQcService.createVideoQc(ctx.id, body);
  }

  @TypedRoute.Get(':id')
  async getVideoQcById(
    @CtxUser() ctx: ContextUser,
    @TypedParam('id') id: string,
  ): Promise<GetVideoQcByIdResponse> {
    return this.videoQcService.getVideoQcById(ctx.id, id);
  }

  @TypedRoute.Get('')
  async getVideoQcList(
    @CtxUser() ctx: ContextUser,
    @TypedQuery() query: GetVideoQcListRequest,
  ): Promise<GetVideoQcListResponse> {
    return this.videoQcService.getVideoQcListForUser(ctx.id, query);
  }

  @TypedRoute.Get('progress/:projectId')
  async getVideoQcProgress(
    @TypedParam('projectId') projectId: string,
  ): Promise<VideoQcProgressResponse> {
    return this.videoQcService.getVideoQcProgress(projectId);
  }

  @Internal()
  @TypedRoute.Post('progress')
  async handleVideoQcProgress(
    @TypedBody() body: VideoQcProgressEvent,
  ): Promise<void> {
    return this.videoQcService.handleVideoQcProgressEvent(body);
  }

  @TypedRoute.Post('report-upload-progress')
  async handleVideoUploadProgress(
    @TypedBody() body: HandleVideoUploadProgressRequest,
  ): Promise<void> {
    return this.videoQcService.handleVideoUploadProgress(body);
  }

  @TypedRoute.Post('initiate')
  async publishVideoQcEvent(
    @TypedBody() body: VideoQcEventRequestDto,
  ): Promise<VideoQcEventResponseDto> {
    return this.videoQcService.initiateVideoQc(body);
  }
}
