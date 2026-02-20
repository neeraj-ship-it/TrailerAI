import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import type {
  CreateTrailerProjectRequestDto,
  CreateTrailerProjectResponseDto,
  GenerateTrailerRequestDto,
  GenerateTrailerResponseDto,
  TrailerProgressEvent,
  TrailerStatusResponseDto,
  TrailerProjectDetailDto,
  TrailerUploadProgressRequestDto,
  TrailerCompleteMultipartUploadRequestDto,
  GetAllTrailerProjectsQueryDto,
  TrailerProjectListItemDto,
  CreateTrailerUploadUrlRequestDto,
  CreateTrailerUploadUrlResponseDto,
} from '../dtos/trailer.dto';
import { TrailerService } from '../services/trailer.service';
import { Internal, SkipGlobalAuth } from '@app/auth';
import { CMSOrAdminGuard } from '@app/auth/guards/cms-or-admin.guard';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';

@Controller('trailer')
// @UseGuards(CMSOrAdminGuard) // DISABLED FOR DEVELOPMENT
@SkipGlobalAuth()
export class TrailerController {
  constructor(private readonly trailerService: TrailerService) {}

  @TypedRoute.Post('complete-multipart-upload')
  async completeMultipartUpload(
    @TypedBody() body: TrailerCompleteMultipartUploadRequestDto,
  ): Promise<void> {
    return this.trailerService.completeMultipartUpload(body);
  }

  @TypedRoute.Post('project')
  async createProject(
    @TypedBody() body: CreateTrailerProjectRequestDto,
  ): Promise<CreateTrailerProjectResponseDto> {
    return this.trailerService.createProject(body);
  }

  @TypedRoute.Post('upload-url/create')
  async createUploadUrl(
    @TypedBody() body: CreateTrailerUploadUrlRequestDto,
  ): Promise<CreateTrailerUploadUrlResponseDto> {
    return this.trailerService.createUploadUrl(body);
  }

  @TypedRoute.Post('generate')
  async generateTrailer(
    @TypedBody() body: GenerateTrailerRequestDto,
  ): Promise<GenerateTrailerResponseDto> {
    return this.trailerService.generateTrailer(body);
  }

  @TypedRoute.Get('projects')
  async getAllProjects(
    @TypedQuery() query: GetAllTrailerProjectsQueryDto,
  ): Promise<PaginatedResponseDTO<TrailerProjectListItemDto>> {
    return this.trailerService.getAllProjects(query);
  }

  @TypedRoute.Get('project/:projectId')
  async getTrailerProjectDetail(
    @TypedParam('projectId') projectId: string,
  ): Promise<TrailerProjectDetailDto | null> {
    return this.trailerService.getTrailerProjectDetail(projectId);
  }

  @TypedRoute.Get('status/:projectId')
  async getTrailerStatus(
    @TypedParam('projectId') projectId: string,
  ): Promise<TrailerStatusResponseDto> {
    return this.trailerService.getTrailerStatus(projectId);
  }

  @TypedRoute.Get(':projectId/variant/:variantId/download')
  async getVariantDownloadUrl(
    @TypedParam('projectId') projectId: string,
    @TypedParam('variantId') variantId: string,
  ): Promise<{ url: string }> {
    const url = await this.trailerService.getVariantDownloadUrl(
      projectId,
      variantId,
    );
    return { url };
  }

  @TypedRoute.Post('draft-narrative')
  async draftNarrative(
    @TypedBody() body: GenerateTrailerRequestDto,
  ): Promise<{ status: string; message: string; projectId: string }> {
    return this.trailerService.draftNarrative(body);
  }

  @TypedRoute.Get('narrative/:projectId')
  async getNarrativeDraft(
    @TypedParam('projectId') projectId: string,
  ): Promise<{ draft: any; status: string } | null> {
    return this.trailerService.getNarrativeDraft(projectId);
  }

  @TypedRoute.Post('approve-narrative')
  async approveNarrative(
    @TypedBody()
    body: {
      projectId: string;
      approvedNarrative: any;
      modifications?: any;
    },
  ): Promise<GenerateTrailerResponseDto> {
    return this.trailerService.approveAndGenerateTrailer(body);
  }

  @TypedRoute.Get('narrative-status/:projectId')
  async getNarrativeStatus(
    @TypedParam('projectId') projectId: string,
  ): Promise<{ status: string; phase: string; message?: string }> {
    return this.trailerService.getNarrativeStatus(projectId);
  }

  @Internal()
  @TypedRoute.Post('progress/:id')
  async handleTrailerProgress(
    @TypedParam('id') id: string,
    @TypedBody() body: TrailerProgressEvent,
  ): Promise<void> {
    return this.trailerService.handleTrailerProgressEvent({
      ...body,
      projectId: id,
    });
  }

  @TypedRoute.Post('report-upload-progress')
  async handleUploadProgress(
    @TypedBody() body: TrailerUploadProgressRequestDto,
  ): Promise<void> {
    return this.trailerService.handleUploadProgress(body);
  }
}
