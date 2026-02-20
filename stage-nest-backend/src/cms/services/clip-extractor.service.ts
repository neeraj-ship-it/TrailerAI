import { Injectable, Logger } from '@nestjs/common';

import {
  CreateClipExtractorProjectRequestDto,
  CreateClipExtractorProjectResponseDto,
  StartClipExtractionResponseDto,
  ClipExtractorProgressEvent,
  ClipExtractorProjectDetailDto,
  ClipExtractorStatusResponseDto,
  GetAllClipExtractorProjectsQueryDto,
  ClipExtractorProjectListItemDto,
  ClipExtractorTaskMessage,
} from '../dtos/clip-extractor.dto';
import { ClipExtractorProjectRepository } from '../repositories/clip-extractor-project.repository';
import { TaskExecutionService } from './task-execution.service';
import { S3Service } from '@app/storage/s3.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ClipExtractorService {
  private readonly logger = new Logger(ClipExtractorService.name);

  constructor(
    private readonly clipExtractorProjectRepository: ClipExtractorProjectRepository,
    private readonly taskExecutionService: TaskExecutionService,
    private readonly s3Service: S3Service,
  ) {}

  async createProject(
    body: CreateClipExtractorProjectRequestDto,
  ): Promise<CreateClipExtractorProjectResponseDto> {
    const projectId = `clip-${randomBytes(4).toString('hex')}`;

    const project = await this.clipExtractorProjectRepository.createProject({
      projectId,
      videoUrl: body.videoUrl,
      contentSlug: body.contentSlug,
      contentMetadata: body.contentMetadata,
      clipConfig: body.clipConfig,
    });

    this.logger.log(`Created clip extractor project: ${projectId}`);

    return {
      projectId: project.projectId,
      videoUrl: project.videoUrl,
      status: project.status,
      createdAt: project.createdAt,
    };
  }

  async startExtraction(
    projectId: string,
  ): Promise<StartClipExtractionResponseDto> {
    const project = await this.clipExtractorProjectRepository.findOne({
      projectId,
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (project.status === 'processing') {
      return {
        projectId,
        status: 'processing',
        message: 'Extraction already in progress',
      };
    }

    // Update status to processing
    await this.clipExtractorProjectRepository.updateOne({
      filter: { projectId },
      update: {
        status: 'processing',
        progress: 0,
        progressStage: 'initiated',
        error: null,
        startedAt: new Date(),
      },
    });

    // Build task message for Python service
    const taskMessage: ClipExtractorTaskMessage = {
      projectId: project.projectId,
      videoUrl: project.videoUrl,
      s3Bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
      s3Region: APP_CONFIGS.AWS.S3.REGION,
      s3ClipsOutputFolderKey: `clip-extractor/${projectId}/clips`,
      progressBaseUrl: APP_CONFIGS.CLIP_EXTRACTOR.PROGRESS_BASE_URL,
      token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
      contentMetadata: project.contentMetadata,
      clipConfig: project.clipConfig,
    };

    // Execute task (local dev or Fargate)
    try {
      await this.taskExecutionService.executeClipExtractorTask(taskMessage);
      this.logger.log(`Started clip extraction for project: ${projectId}`);
    } catch (error) {
      await this.clipExtractorProjectRepository.updateOne({
        filter: { projectId },
        update: {
          status: 'failed',
          error: `Failed to start extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
      throw error;
    }

    return {
      projectId,
      status: 'processing',
      message: 'Clip extraction started',
    };
  }

  async getProjectDetail(
    projectId: string,
  ): Promise<ClipExtractorProjectDetailDto | null> {
    const project = await this.clipExtractorProjectRepository.findOne({
      projectId,
    });

    if (!project) return null;

    // Build stream proxy URLs for clips (S3 bucket doesn't allow direct presigned access)
    const baseStreamUrl = `${APP_CONFIGS.CLIP_EXTRACTOR.PROGRESS_BASE_URL.replace('/cms/clip-extractor/progress', '')}/cms/clip-extractor/stream/${projectId}`;

    const clips = (project.clips || []).map((clip) => {
      // Extract filename from s3Key for stream URL
      const fileName = clip.s3Key ? clip.s3Key.split('/').pop() : undefined;
      const streamUrl = fileName ? `${baseStreamUrl}/${fileName}` : undefined;
      return {
        clipId: clip.clipId,
        clipUrl: streamUrl || clip.clipUrl || undefined,
        s3Key: clip.s3Key || undefined,
        duration: clip.duration,
        score: clip.score,
        beatOrder: clip.beatOrder,
        beatType: clip.beatType,
        emotionalTone: clip.emotionalTone,
        description: clip.description,
        timecodeStart: clip.timecodeStart,
        timecodeEnd: clip.timecodeEnd,
        isCompiled: clip.isCompiled,
        fileSize: clip.fileSize,
      };
    });

    // Build stream URL for compiled video
    const compiledStreamUrl = project.compiledVideoUrl
      ? `${baseStreamUrl}/compiled_best_clips.mp4`
      : undefined;

    return {
      projectId: project.projectId,
      videoUrl: project.videoUrl,
      contentSlug: project.contentSlug || undefined,
      contentMetadata: project.contentMetadata || undefined,
      status: project.status,
      progress: project.progress,
      progressStage: project.progressStage || undefined,
      clips,
      compiledVideoUrl: compiledStreamUrl || project.compiledVideoUrl || undefined,
      extractionReportUrl: project.extractionReportUrl || undefined,
      error: project.error || undefined,
      startedAt: project.startedAt || undefined,
      completedAt: project.completedAt || undefined,
      createdAt: project.createdAt || undefined,
    };
  }

  async getStatus(
    projectId: string,
  ): Promise<ClipExtractorStatusResponseDto> {
    const project = await this.clipExtractorProjectRepository.findOne({
      projectId,
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return {
      projectId: project.projectId,
      status: project.status,
      progress: project.progress,
      progressStage: project.progressStage || undefined,
      error: project.error || undefined,
    };
  }

  async handleProgressEvent(
    event: ClipExtractorProgressEvent & { projectId: string },
  ): Promise<void> {
    const project = await this.clipExtractorProjectRepository.findOne({
      projectId: event.projectId,
    });

    if (!project) {
      this.logger.warn(
        `Progress event for unknown project: ${event.projectId}`,
      );
      return;
    }

    const update: Record<string, any> = {};

    // Update progress
    if (event.progress !== undefined) {
      update.progress = event.progress;
    }
    if (event.progressStage) {
      update.progressStage = event.progressStage;
    }

    // Handle completion
    if (event.status === 'processing-complete' && event.details) {
      update.status = 'completed';
      update.progress = 100;
      update.completedAt = new Date();

      // Save clips from Python output
      if (event.details.clips) {
        update.clips = event.details.clips.map((clip) => ({
          clipId: clip.clipId,
          clipUrl: clip.clipUrl,
          s3Key: clip.s3Key,
          duration: clip.duration,
          score: clip.score,
          beatOrder: clip.beatOrder,
          beatType: clip.beatType,
          emotionalTone: clip.emotionalTone,
          description: clip.description,
          timecodeStart: clip.timecodeStart,
          timecodeEnd: clip.timecodeEnd,
          isCompiled: clip.isCompiled,
          fileSize: clip.fileSize,
        }));
      }

      // Save compiled video URL
      if (event.details.compiledVideo?.clipUrl) {
        update.compiledVideoUrl = event.details.compiledVideo.clipUrl;
      }

      // Save report URL
      if (event.details.reportS3Key) {
        update.extractionReportUrl = event.details.reportS3Key;
      }

      this.logger.log(
        `Clip extraction completed for project: ${event.projectId} ` +
          `(${event.details.totalClips} clips, ${event.details.totalTimeSeconds?.toFixed(1)}s)`,
      );
    }

    // Handle failure
    if (event.status === 'processing-failed') {
      update.status = 'failed';
      update.error =
        event.details?.error || event.message || 'Unknown error';

      this.logger.error(
        `Clip extraction failed for project: ${event.projectId}: ${update.error}`,
      );
    }

    await this.clipExtractorProjectRepository.updateOne({
      filter: { projectId: event.projectId },
      update,
    });
  }

  async getAllProjects(
    query: GetAllClipExtractorProjectsQueryDto,
  ): Promise<PaginatedResponseDTO<ClipExtractorProjectListItemDto>> {
    return this.clipExtractorProjectRepository.findAllProjects({
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      sortOrder: query.sortOrder,
      status: query.status,
    });
  }
}
