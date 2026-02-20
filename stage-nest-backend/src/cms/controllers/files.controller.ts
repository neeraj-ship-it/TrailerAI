import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import type {
  CreateFrameUploadUrlRequestDto,
  CreateFrameUploadUrlResponseDto,
  CompleteMultipartUploadRequestDto,
  CreateThumbnailUploadUrlRequestDto,
  CreateThumbnailUploadUrlResponseDto,
  ExtractFramesRequestDto,
  ExtractFramesResponseDto,
  GenerateFileUploadUrlRequestDto,
  GenerateFileUploadUrlResponseDto,
  GeneratePosterRequestDto,
  GenerateQcVideoUploadUrlRequestDto,
  GenerateQcVideoUploadUrlResponseDto,
  GenerateSubtitleUploadUrlResponseDto,
  GetGoogleDriveFilesRequestDto,
  GetGoogleDriveFilesResponseDto,
  GetUploadProgressRequestDto,
  ReportFrameUploadStatusRequestDto,
  ReportFrameUploadStatusResponseDto,
  ResizePosterRequestDto,
  StartTranscodingForEpisodeRequestDto,
  StartTranscodingForMovieRequestDto,
  TransformThumbnailImageRequestDto,
  UpdateFileUploadProgressRequestDto,
  StartTranscodingForReelRequestDto,
  StartTranscodingForEpisodeTeaserRequestDto,
  FrameExtractionProgressEvent,
} from '../dtos';

import { FileManagerService } from '../services/file-manager.service';
import { GoogleDriveService } from '../services/google-drive.service';
import {
  CMSOrAdminGuard,
  Internal,
  PlatformPublic,
  SkipGlobalAuth,
} from '@app/auth';
import { ContentType } from '@app/common/enums/common.enums';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Lang } from 'common/enums/app.enum';
import { VisionularContentType } from 'common/interfaces/visionular.interface';

@Controller('files')
@SkipGlobalAuth()
// @UseGuards(CMSOrAdminGuard) // DISABLED FOR DEVELOPMENT
export class MediaFilesController {
  constructor(
    private readonly fileManagerService: FileManagerService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  // ========== Episode-Specific Endpoints ==========

  @TypedRoute.Post('complete-multipart-upload')
  completeMultipartUpload(
    @TypedBody() body: CompleteMultipartUploadRequestDto,
  ): Promise<void> {
    return this.fileManagerService.completeMultipartUpload({
      parts: body.parts,
      rawMediaId: body.rawMediaId,
      uploadId: body.uploadId,
    });
  }

  @TypedRoute.Post('episode/upload-url/promo/create')
  createEpisodePromoUploadUrl(
    @TypedBody() body: GenerateFileUploadUrlRequestDto,
  ): Promise<GenerateFileUploadUrlResponseDto> {
    return this.fileManagerService.generateShowEpisodeReelMovieUploadUrl({
      ...body,
      contentType: ContentType.SHOW,
    });
  }

  @TypedRoute.Post('frame/upload-url')
  async createFrameUploadUrl(
    @TypedBody() body: CreateFrameUploadUrlRequestDto,
  ): Promise<CreateFrameUploadUrlResponseDto> {
    return this.fileManagerService.generateFrameUploadUrl(body);
  }

  // ========== Media Type-Specific Endpoints ==========
  @TypedRoute.Post(':contentType/upload-url/video/create')
  createMediaUploadUrl(
    @TypedParam('contentType')
    contentType:
      | ContentType.EPISODE
      | ContentType.MOVIE
      | ContentType.REEL
      | ContentType.POSTER_VIDEO,
    @TypedBody() body: GenerateFileUploadUrlRequestDto,
  ): Promise<GenerateFileUploadUrlResponseDto> {
    return this.fileManagerService.generateShowEpisodeReelMovieUploadUrl({
      ...body,
      contentType,
    });
  }

  // ========== Common Endpoints ==========
  @TypedRoute.Post('upload-url/thumbnail/create')
  createThumbnailUploadUrl(
    @TypedBody()
    body: CreateThumbnailUploadUrlRequestDto,
  ): Promise<CreateThumbnailUploadUrlResponseDto> {
    return this.fileManagerService.generateThumbnailUploadUrl(body);
  }

  @PlatformPublic()
  @TypedRoute.Post('extract-frames')
  async extractFrames(
    @TypedBody() body: ExtractFramesRequestDto,
  ): Promise<ExtractFramesResponseDto> {
    return this.fileManagerService.extractFrames({
      rawMediaId: body.rawMediaId,
      title: body.title,
    });
  }

  @TypedRoute.Post('generate-poster')
  async generatePoster(
    @TypedBody() body: GeneratePosterRequestDto,
  ): Promise<void> {
    return this.fileManagerService.generatePoster(body);
  }

  @TypedRoute.Post('video-qc/upload-url/create')
  generateQcVideoUploadUrl(
    @TypedBody() body: GenerateQcVideoUploadUrlRequestDto,
  ): Promise<GenerateQcVideoUploadUrlResponseDto> {
    return this.fileManagerService.generateMultipartUploadUrl({
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      pathPrefix: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
      projectId: body.projectId,
    });
  }

  @TypedRoute.Post('episode/upload-url/subtitle/create')
  generateSubtitleUploadUrl(
    @TypedBody() body: { slug: string; language: Lang },
  ): Promise<GenerateSubtitleUploadUrlResponseDto> {
    return this.fileManagerService.generateSubtitleUploadUrl(body);
  }

  @TypedRoute.Post('google-drive/list-files-from-link')
  getGoogleDriveFiles(
    @TypedBody() body: GetGoogleDriveFilesRequestDto,
  ): Promise<GetGoogleDriveFilesResponseDto> {
    return this.googleDriveService.processDriveLink(body.links);
  }

  @TypedRoute.Get('/raw-media/status')
  getRawMediaStatus(@TypedQuery() query: { rawMediaIds: string }) {
    return this.fileManagerService.getRawMediaStatus(query);
  }

  // ========== Progress Tracking ==========
  @TypedRoute.Get('transcode/progress')
  getTranscodingProgress(
    @TypedQuery() query: { rawMediaIds: string },
  ): Promise<unknown> {
    return this.fileManagerService.getTranscodingTaskDetails(query.rawMediaIds);
  }

  @TypedRoute.Get('/upload-progress')
  getUploadProgress(@TypedQuery() query: GetUploadProgressRequestDto) {
    return this.fileManagerService.getUploadProgress(query);
  }

  @Internal()
  @TypedRoute.Post('frame-extraction-progress')
  async handleFrameExtractionProgress(
    @TypedBody() body: FrameExtractionProgressEvent,
  ): Promise<void> {
    return this.fileManagerService.handleFrameExtractionProgress(body);
  }

  @TypedRoute.Post('frame/report-status')
  async reportFrameUploadStatus(
    @TypedBody() body: ReportFrameUploadStatusRequestDto,
  ): Promise<ReportFrameUploadStatusResponseDto> {
    return this.fileManagerService.reportFrameUploadStatus(body);
  }

  @TypedRoute.Post('resize-poster')
  resizePoster(@TypedBody() body: ResizePosterRequestDto): void {
    return this.fileManagerService.resizePoster(body);
  }

  @TypedRoute.Post(':contentType/transcode/trailer/initiate')
  async startTrailerTranscoding(
    @TypedParam('contentType')
    contentType: ContentType.EPISODE | ContentType.MOVIE,
    @TypedBody()
    body: {
      slug: string;
      rawMediaId: string;
      peripheralId: number;
    },
  ) {
    if (contentType === ContentType.EPISODE) {
      await this.fileManagerService.startTranscodingForShowPeripherals({
        peripheralId: body.peripheralId,
        rawMediaId: body.rawMediaId,
        showSlug: body.slug,
      });
      return;
    }
    await this.fileManagerService.startTranscodingForMoviePeripherals({
      movieSlug: body.slug,
      peripheralId: body.peripheralId,
      rawMediaId: body.rawMediaId,
    });
  }

  @TypedRoute.Post(':contentType/transcode/initiate')
  startTranscoding(
    @TypedParam('contentType')
    contentType:
      | ContentType.EPISODE
      | ContentType.MOVIE
      | ContentType.REEL
      | VisionularContentType.EPISODE_TEASER,
    @TypedBody()
    body:
      | StartTranscodingForEpisodeRequestDto
      | StartTranscodingForMovieRequestDto
      | StartTranscodingForReelRequestDto
      | StartTranscodingForEpisodeTeaserRequestDto,
  ): Promise<unknown> {
    switch (contentType) {
      case ContentType.EPISODE:
        return this.fileManagerService.startTranscodingForEpisode(
          body as StartTranscodingForEpisodeRequestDto,
        );
      case ContentType.MOVIE:
        return this.fileManagerService.startTranscodingForMovie(
          body as StartTranscodingForMovieRequestDto,
        );
      case ContentType.REEL:
        return this.fileManagerService.startTranscodingForReel(
          body as StartTranscodingForReelRequestDto,
        );
      case VisionularContentType.EPISODE_TEASER:
        return this.fileManagerService.startTranscodingForEpisodeTeaser(
          body as StartTranscodingForEpisodeTeaserRequestDto,
        );
      default:
        throw new BadRequestException(
          'Unsupported content type for transcoding',
        );
    }
  }

  @TypedRoute.Post('transcode/all-episodes')
  startTranscodingForAllEpisodes(
    @TypedBody()
    body: {
      showSlug: string;
    },
  ): Promise<{
    totalEpisodes: number;
  }> {
    return this.fileManagerService.startTranscodingForAllEpisodes({
      showSlug: body.showSlug,
    });
  }
  @TypedRoute.Post('transform/thumbnail/image')
  transformThumbnailImage(
    @TypedBody()
    body: TransformThumbnailImageRequestDto,
  ) {
    return this.fileManagerService.transformImage(body);
  }

  @TypedRoute.Patch('upload-url/update/progress')
  updateEpisodeUploadProgress(
    @TypedBody() body: UpdateFileUploadProgressRequestDto,
  ): Promise<void> {
    return this.fileManagerService.updateFileUploadProgress(body);
  }

  @TypedRoute.Post(':contentType/upload/by-google-drive')
  uploadViaDrive(
    @TypedParam('contentType')
    contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL,
    @TypedBody() body: { fileIds: string[] },
  ) {
    return this.fileManagerService.uploadContentFromGoogleDrive({
      contentType,
      fileIds: body.fileIds,
    });
  }
}
