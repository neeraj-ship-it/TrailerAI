import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import type {
  CreateClipExtractorProjectRequestDto,
  CreateClipExtractorProjectResponseDto,
  StartClipExtractionResponseDto,
  ClipExtractorProgressEvent,
  ClipExtractorProjectDetailDto,
  ClipExtractorStatusResponseDto,
  GetAllClipExtractorProjectsQueryDto,
  ClipExtractorProjectListItemDto,
} from '../dtos/clip-extractor.dto';
import { ClipExtractorService } from '../services/clip-extractor.service';
import { Internal, SkipGlobalAuth } from '@app/auth';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';

@Controller('clip-extractor')
@SkipGlobalAuth()
export class ClipExtractorController {
  constructor(
    private readonly clipExtractorService: ClipExtractorService,
  ) {}

  @TypedRoute.Post('project')
  async createProject(
    @TypedBody() body: CreateClipExtractorProjectRequestDto,
  ): Promise<CreateClipExtractorProjectResponseDto> {
    return this.clipExtractorService.createProject(body);
  }

  @TypedRoute.Post('extract/:projectId')
  async startExtraction(
    @TypedParam('projectId') projectId: string,
  ): Promise<StartClipExtractionResponseDto> {
    return this.clipExtractorService.startExtraction(projectId);
  }

  @TypedRoute.Get('project/:projectId')
  async getProjectDetail(
    @TypedParam('projectId') projectId: string,
  ): Promise<ClipExtractorProjectDetailDto | null> {
    return this.clipExtractorService.getProjectDetail(projectId);
  }

  @TypedRoute.Get('status/:projectId')
  async getStatus(
    @TypedParam('projectId') projectId: string,
  ): Promise<ClipExtractorStatusResponseDto> {
    return this.clipExtractorService.getStatus(projectId);
  }

  @Internal()
  @TypedRoute.Post('progress/:projectId')
  async handleProgress(
    @TypedParam('projectId') projectId: string,
    @TypedBody() body: ClipExtractorProgressEvent,
  ): Promise<void> {
    return this.clipExtractorService.handleProgressEvent({
      ...body,
      projectId,
    });
  }

  @TypedRoute.Get('projects')
  async getAllProjects(
    @TypedQuery() query: GetAllClipExtractorProjectsQueryDto,
  ): Promise<PaginatedResponseDTO<ClipExtractorProjectListItemDto>> {
    return this.clipExtractorService.getAllProjects(query);
  }
}
