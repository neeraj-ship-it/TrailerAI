import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ObjectId, wrap } from '@mikro-orm/mongodb';

import {
  CompleteMultipartUploadRequestDto,
  CreateThumbnailUploadUrlRequestDto,
  CreateThumbnailUploadUrlResponseDto,
  ExtractFramesRequestDto,
  ExtractFramesResponseDto,
  GenerateFileUploadUrlRequestDto,
  GenerateFileUploadUrlResponseDto,
  GeneratePosterRequestDto,
  ResizePosterRequestDto,
  GenerateQcVideoUploadUrlResponseDto,
  GetTranscodingProgressResponseDto,
  GetUploadProgressRequestDto,
  StartTranscodingForEpisodeRequestDto,
  StartTranscodingForMovieRequestDto,
  TransformThumbnailImageRequestDto,
  UpdateFileUploadProgressRequestDto,
} from '../dtos/files.dto';
import {
  FrameExtractionStatus,
  PosterGenerationStatus,
} from '../entities/poster-project.entity';
import { MP4Resolution } from '../interfaces/files.interface';
import { CompleteMultipartUploadForRawMediaParams } from '../interfaces/s3.interface';
import { ContentRepository } from '../repositories/content.repository';
import { EpisodeRepository } from '../repositories/episode.repository';
import { PosterProjectRepository } from '../repositories/poster-project.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { ReelRepository } from '../repositories/reel.repository';
import { SeasonRepository } from '../repositories/season.repository';
import { ShowRepository } from '../repositories/show.repository';
import { VisionularTaskRepository } from '../repositories/visionular.repository';

import { GoogleDriveService } from './google-drive.service';
import { AWSMediaConvertService } from './media-convert.service';

import { VisionularService } from './visionular.service';
import { S3Service } from '@app/storage';
import {
  MediaStatusEnum,
  RawMedia,
  SourceTypeEnum,
  TaskStatusEnum,
  TranscodingEngineEnum,
  TranscodingTaskTypeEnum,
} from 'common/entities/raw-media.entity';

import {
  VideoAspectRatioEnum,
  FrameExtractionFrame,
  FrameExtractionProgressEvent,
  FrameExtractionStatusEnum,
} from '../dtos';
import { ImageService } from './image.service';
import { ContentType } from '@app/common/enums/common.enums';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { CMS_CONFIG } from 'common/configs/cms.config';
import { Lang } from 'common/enums/app.enum';
import {
  VisionularContentType,
  VisionularTranscodingTemplate,
} from 'common/interfaces/visionular.interface';
import { ContentFormat } from 'src/content/entities/show.entity';

import { CreateImageUrlDto } from '../dtos/payment.dto';
import { APP_CONFIGS } from 'common/configs/app.config';
import {
  DEFAULT_POSTER_RATIOS,
  FRAME_EXTRACTION,
} from 'common/constants/app.constant';

import {
  CMSQueueKeys,
  DriveUploadData,
  DriveUploadPayload,
} from '../interfaces/queue-payloads.interface';
import { CmsJobDispatcher } from './cms-job-dispatcher.service';
import { TaskExecutionService } from './task-execution.service';
import { Contents } from 'common/entities/contents.entity';
import { Episode, EpisodeStatus } from 'common/entities/episode.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { generatePosterPrompt } from 'common/helpers/prompt.helper';
import { CommonUtils } from 'common/utils/common.utils';
import {
  MediaFilePathUtils,
  S3_BUCKETS,
  sanitizeFileExtension,
} from 'common/utils/media-file.utils';

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);
  constructor(
    private readonly s3Service: S3Service,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly visionularService: VisionularService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly imageService: ImageService,
    private readonly episodeRepository: EpisodeRepository,
    private readonly contentRepository: ContentRepository,
    private readonly showRepository: ShowRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly visionularTaskRepository: VisionularTaskRepository,
    private readonly awsMediaConvertService: AWSMediaConvertService,
    private readonly reelRepository: ReelRepository,

    private readonly cmsJobDispatcher: CmsJobDispatcher,
    private readonly taskExecutionService: TaskExecutionService,
    private readonly posterProjectRepository: PosterProjectRepository,
    private readonly promptRepository: PromptRepository,
  ) {}

  private buildDriveUploadQueuePayload({
    bucket,
    contentType,
    fileId,
    filePath,
    fullFilePath,
    googleDriveFileDetails,
    rawMedia,
  }: {
    googleDriveFileDetails: Awaited<
      ReturnType<GoogleDriveService['getResourceDetails']>
    >;
    rawMedia: RawMedia;
    bucket: string;
    filePath: string;
    fullFilePath: string;
    contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL;
    fileId: string;
  }): DriveUploadPayload {
    const uploadData: DriveUploadData = {
      bucket,
      contentType,
      durationInSeconds: Math.floor(
        (googleDriveFileDetails.videoMediaMetadata?.durationMillis || 0) / 1000,
      ),
      fileId,
      filePath,
      fullFilePath,
      mimeType: googleDriveFileDetails.mimeType || 'application/octet-stream',
      rawMediaId: rawMedia._id.toString(),
      size: googleDriveFileDetails.size || 0,
      webViewLink: googleDriveFileDetails.webViewLink || 'N/A',
    };

    return {
      key: CMSQueueKeys.DRIVE_UPLOAD,
      payload: uploadData,
    };
  }

  private calculateMultipartUploadParts(fileSize: number): {
    numberOfParts: number;
    partSize: number;
  } {
    const { MAX_PART_SIZE, MAX_PARTS, MIN_PART_SIZE, TARGET_PART_SIZE } =
      APP_CONFIGS.AWS.S3.MULTIPART_UPLOAD;

    let partSize = Math.max(
      MIN_PART_SIZE,
      Math.min(MAX_PART_SIZE, TARGET_PART_SIZE),
    );
    let numberOfParts = Math.ceil(fileSize / partSize);

    if (numberOfParts > MAX_PARTS) {
      partSize = Math.ceil(fileSize / MAX_PARTS);
      numberOfParts = MAX_PARTS;
    }

    return { numberOfParts, partSize };
  }

  private async createQueuedRawMediaRecord({
    fullFilePath,
    googleDriveFileDetails,
  }: {
    googleDriveFileDetails: Awaited<
      ReturnType<GoogleDriveService['getResourceDetails']>
    >;
    fullFilePath: string;
  }): Promise<RawMedia> {
    const rawMedia = await this.rawMediaRepository.createBaseRawMedia({
      contentType:
        googleDriveFileDetails.mimeType || 'application/octet-stream',
      destination: { url: fullFilePath },
      durationInSeconds: Math.floor(
        (googleDriveFileDetails.videoMediaMetadata?.durationMillis || 0) / 1000,
      ),
      source: {
        type: SourceTypeEnum.GOOGLE_DRIVE,
        url: googleDriveFileDetails.webViewLink || 'N/A',
      },
      status: MediaStatusEnum.QUEUED,
    });

    if (!rawMedia) {
      throw new Error('Failed to create raw media');
    }

    return rawMedia;
  }

  private async createVisionularTranscodingTasks({
    contentType,
    h264TranscodingParams,
    h265TranscodingParams,
    rawMedia,
    transcodingSourceLink,
  }: {
    contentType: VisionularContentType;
    h264TranscodingParams: { s3Key: string };
    h265TranscodingParams: { s3Key: string };
    rawMedia: RawMedia;
    transcodingSourceLink: string;
  }) {
    const [hls265TranscodingTask, hls264TranscodingTask] = await Promise.all([
      this.visionularService.createTranscodingForRawMedia({
        contentType,
        outputPath: h265TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H265,
      }),
      this.visionularService.createTranscodingForRawMedia({
        contentType,
        outputPath: h264TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H264,
      }),
    ]);

    return {
      hls264TranscodingTask,
      hls265TranscodingTask,
    };
  }

  private async dispatchPreparedUploadJobsInOrder(
    preparedFiles: {
      index: number;
      fileId: string;
      queuePayload: DriveUploadPayload | null;
      rawMedia: RawMedia | null;
      error: Error | null;
    }[],
  ): Promise<
    {
      googleDriveFileId: string;
      rawMediaId?: string;
      error?: string;
    }[]
  > {
    const uploadResults: {
      googleDriveFileId: string;
      rawMediaId?: string;
      error?: string;
    }[] = [];

    for (const preparedFile of preparedFiles) {
      if (preparedFile.error || !preparedFile.queuePayload) {
        uploadResults.push({
          error:
            preparedFile.error instanceof Error
              ? preparedFile.error.message
              : 'Unknown error',
          googleDriveFileId: preparedFile.fileId,
        });
        continue;
      }

      const queuePayload = preparedFile.queuePayload;

      const [, dispatchError] = await this.errorHandler.try(async () => {
        await this.cmsJobDispatcher.dispatchDriveUploadJob(
          queuePayload,
          preparedFile.fileId,
          preparedFile.rawMedia?._id.toString() || '',
        );
      });

      if (dispatchError) {
        this.logger.error(
          `Failed to dispatch upload job for ${preparedFile.fileId}`,
          dispatchError,
        );

        if (preparedFile.rawMedia) {
          await this.markRawMediaRecordAsFailed(preparedFile.rawMedia);
        }

        uploadResults.push({
          error:
            dispatchError instanceof Error
              ? dispatchError.message
              : 'Unknown error',
          googleDriveFileId: preparedFile.fileId,
        });
        continue;
      }

      uploadResults.push({
        googleDriveFileId: preparedFile.fileId,
        rawMediaId: preparedFile.rawMedia?._id.toString(),
      });
    }

    return uploadResults;
  }

  private async fetchAndValidateGoogleDriveFileDetails(fileId: string) {
    const googleDriveFileDetails =
      await this.googleDriveService.getResourceDetails(fileId);

    if (!googleDriveFileDetails?.fileExtension) {
      throw new Error(`Missing file extension for file: ${fileId}`);
    }

    return googleDriveFileDetails;
  }

  private async fetchRawMediaEpisodesAndContent({
    contentSlug,
    episodeSlug,
    rawMediaId,
  }: {
    rawMediaId: string;
    episodeSlug: string;
    contentSlug: string;
  }) {
    const [rawMedia, episodes, content] = await Promise.all([
      this.rawMediaRepository.findOneOrFail(
        {
          _id: new ObjectId(rawMediaId),
        },
        { failHandler: () => new NotFoundException('File not found') },
      ),
      this.episodeRepository.find({
        slug: episodeSlug,
      }),
      this.contentRepository.find({
        slug: contentSlug,
      }),
    ]);

    return { content, episodes, rawMedia };
  }

  private findMediaListIndexByPeripheralId({
    episodes,
    peripheralId,
  }: {
    episodes: Episode[];
    peripheralId: number;
  }): number {
    const index = episodes[0].mediaList.findIndex(
      (media) => media.id === peripheralId,
    );

    if (index === -1) {
      throw new Error('Invalid peripheral Id');
    }

    return index;
  }

  private generateFilePathForContentType({
    contentType,
    fileExtension,
    fileId,
  }: {
    fileId: string;
    contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL;
    fileExtension: string;
  }): { bucket: string; filePath: string; fullFilePath: string } {
    const fileName = `${fileId}-${Date.now()}`;

    switch (contentType) {
      case ContentType.EPISODE:
        return MediaFilePathUtils.generateRawShowEpisodeFilePath({
          fileExtension,
          fileName,
        });
      case ContentType.REEL:
        return MediaFilePathUtils.generateRawReelFilePath({
          fileExtension,
          fileName,
        });
      case ContentType.MOVIE:
        return MediaFilePathUtils.generateRawMovieFilePath({
          fileExtension,
          fileName,
        });
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  private async generateSignedUrlForTranscoding(
    rawMediaDestinationUrl: string,
  ): Promise<string> {
    return this.s3Service.generateViewSignedUrl({
      key: rawMediaDestinationUrl,
    });
  }

  private generateTranscodingOutputPaths({
    contentType,
    episodeSlug,
    rawMediaDestinationUrl,
    showSlug,
  }: {
    contentType:
      | VisionularContentType.EPISODE_PERIPHERAL
      | VisionularContentType.EPISODE_TEASER;
    episodeSlug: string;
    rawMediaDestinationUrl: string;
    showSlug?: string;
  }) {
    if (contentType === VisionularContentType.EPISODE_PERIPHERAL) {
      const h264TranscodingParams =
        MediaFilePathUtils.generateContentTranscodingOutputPath({
          contentType: VisionularContentType.EPISODE_PERIPHERAL,
          episodeSlug,
          sourceLink: rawMediaDestinationUrl,
          transcodingTemplate: VisionularTranscodingTemplate.H264,
        });

      const h265TranscodingParams =
        MediaFilePathUtils.generateContentTranscodingOutputPath({
          contentType: VisionularContentType.EPISODE_PERIPHERAL,
          episodeSlug,
          sourceLink: rawMediaDestinationUrl,
          transcodingTemplate: VisionularTranscodingTemplate.H265,
        });

      return {
        h264TranscodingParams,
        h265TranscodingParams,
      };
    }

    if (!showSlug) {
      throw new Error('showSlug is required for EPISODE_TEASER');
    }

    const h264TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.EPISODE_TEASER,
        episodeSlug,
        showSlug,
        sourceLink: rawMediaDestinationUrl,
        transcodingTemplate: VisionularTranscodingTemplate.H264,
      });

    const h265TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.EPISODE_TEASER,
        episodeSlug,
        showSlug,
        sourceLink: rawMediaDestinationUrl,
        transcodingTemplate: VisionularTranscodingTemplate.H265,
      });

    return {
      h264TranscodingParams,
      h265TranscodingParams,
    };
  }

  private async markRawMediaRecordAsFailed(rawMedia: RawMedia): Promise<void> {
    rawMedia.status = MediaStatusEnum.UPLOAD_FAILED;
    await this.rawMediaRepository.save(rawMedia);
  }

  private async performFrameExtraction(
    rawMediaId: string,
    title?: string,
  ): Promise<void> {
    const rawMedia = await this.rawMediaRepository.findOneOrFail({
      _id: new ObjectId(rawMediaId),
    });
    const {
      destination: { url: videoS3Url },
      status: originalStatus,
    } = rawMedia;

    wrap(rawMedia).assign(
      {
        status: MediaStatusEnum.GENERATING_FRAMES,
        title,
      },
      { merge: true },
    );
    const { s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(videoS3Url);

    await this.rawMediaRepository.save(rawMedia);

    // Find poster project by rawMediaId to get project details
    const posterProject = await this.posterProjectRepository.findOne({
      rawMediaId: new ObjectId(rawMediaId),
    });

    if (!posterProject) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND(
        'Poster project not found for this rawMediaId',
      );
    }

    const projectId = posterProject._id.toString();
    const projectName = CommonUtils.sanitizeString(posterProject.name);

    const { filePath: s3UploadDestination } =
      MediaFilePathUtils.generateExtractedFramePath({
        projectId,
        projectName,
      });

    // Update project status to GENERATING
    await this.posterProjectRepository.updateFrameStatus(
      projectId,
      FrameExtractionStatus.GENERATING,
    );

    await this.errorHandler.try(
      async () => {
        const s3Bucket = APP_CONFIGS.AWS.S3.BUCKETS.MAIN_VIDEO;
        const s3Region = APP_CONFIGS.AWS.S3.REGION;
        const s3UploadBucket = S3_BUCKETS.MEDIA_IMAGE;

        await this.taskExecutionService.executeFrameExtractionTask({
          cutInterval: 1.0,
          progressBaseUrl: APP_CONFIGS.CMS.FRAME_EXTRACTION_PROGRESS_URL,
          projectId: rawMediaId,
          s3Bucket,
          s3FileKey,
          s3Region,
          s3UploadBucket,
          s3UploadDestination,
          token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
        });
      },
      async (error) => {
        rawMedia.status = originalStatus;
        await this.rawMediaRepository.save(rawMedia);
        // Update project status to FAILED
        await this.posterProjectRepository.updateFrameStatus(
          projectId,
          FrameExtractionStatus.FAILED,
        );
        this.logger.error(
          { error, rawMediaId },
          `Frame extraction failed for rawMediaId: ${rawMediaId}, status restored to ${originalStatus}`,
        );
      },
    );
  }

  /**
   * Actual poster generation logic (runs in background)
   * Creates a prompt record, generates images to new S3 path: posters/{projectId}/{promptId}/
   * Outputs JPEG format
   */
  private async performPosterGeneration({
    customPrompt,
    description,
    emotionType,
    genre,
    imageUrls,
    projectId,
    ratios: requestedRatios,
    style,
    title,
    titleImageUrl,
  }: GeneratePosterRequestDto): Promise<void> {
    // Update project status to GENERATING
    await this.posterProjectRepository.updatePosterStatus(
      projectId,
      PosterGenerationStatus.GENERATING,
    );

    await this.errorHandler.try(
      async () => {
        // Create prompt record with user input (not the enhanced prompt sent to Gemini)
        const promptRecord = await this.promptRepository.createPrompt(
          projectId,
          {
            customPrompt,
            description,
            emotionType,
            genre,
            imageUrls,
            ratios: requestedRatios,
            style,
            title,
            titleImageUrl,
          },
        );

        // Use URLs directly instead of fetching from database
        let finalImageUrls = [...imageUrls];

        // If title image is provided, add it as FIRST image
        let hasTitleImage = false;
        if (titleImageUrl) {
          finalImageUrls = [titleImageUrl, ...finalImageUrls];
          hasTitleImage = true;
        }

        if (finalImageUrls.length === 0) {
          throw new Error('No image URLs provided');
        }

        // Build the poster generation prompt using the template with fallback values
        const posterStyle = style || 'cinematic';
        const posterEmotion = emotionType || 'dramatic';
        const hasAdditionalRefs = finalImageUrls.length > 1;
        const prompt = generatePosterPrompt({
          customPrompt,
          description,
          emotion: posterEmotion,
          genre,
          hasAdditionalRefs,
          hasTitleImage,
          style: posterStyle,
          title,
        });

        const fileName = MediaFilePathUtils.generatePosterFilename(title);
        const ratios = requestedRatios ?? DEFAULT_POSTER_RATIOS;

        // Generate images to new path: posters/{projectId}/{promptId}/ in JPEG format
        await this.imageService.generatePosterImagesForProject({
          imageUrls: finalImageUrls,
          outputFileName: fileName,
          projectId,
          promptId: promptRecord._id,
          prompts: [prompt],
          ratios,
        });

        // Update project status to COMPLETED
        await this.posterProjectRepository.updatePosterStatus(
          projectId,
          PosterGenerationStatus.COMPLETED,
        );

        this.logger.log(
          `Poster generation completed for projectId: ${projectId}, promptId: ${promptRecord._id}`,
        );
      },
      async (error) => {
        // Update project status to FAILED
        await this.posterProjectRepository.updatePosterStatus(
          projectId,
          PosterGenerationStatus.FAILED,
        );
        this.logger.error(
          { error, projectId },
          `Poster generation failed for projectId: ${projectId}`,
        );
      },
    );
  }

  private async performPosterResize({
    customPrompt,
    projectId,
    promptId,
    sizes,
    sourceUrl,
  }: ResizePosterRequestDto): Promise<void> {
    // Validate sizes limit
    const maxSizes = APP_CONFIGS.CMS.POSTER_RESIZE.MAX_SIZES_PER_REQUEST;
    if (sizes.length > maxSizes) {
      throw Errors.CMS.POSTER_PROJECT.MAX_SIZES_EXCEEDED(
        `Maximum ${maxSizes} sizes allowed per request`,
      );
    }

    // Check if project is already generating
    const project =
      await this.posterProjectRepository.findProjectById(projectId);
    if (!project) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND('Poster project not found');
    }
    if (
      project.status.poster === PosterGenerationStatus.GENERATING ||
      project.status.frames === FrameExtractionStatus.GENERATING
    ) {
      throw Errors.CMS.POSTER_PROJECT.ALREADY_GENERATING(
        'Poster generation is already in progress',
      );
    }

    // Update project status to GENERATING
    await this.posterProjectRepository.updatePosterStatus(
      projectId,
      PosterGenerationStatus.GENERATING,
    );

    await this.errorHandler.try(
      async () => {
        await this.imageService.resizePosterToSizes({
          customPrompt,
          projectId,
          promptId,
          sizes,
          sourceUrl,
        });

        // Update project status to COMPLETED
        await this.posterProjectRepository.updatePosterStatus(
          projectId,
          PosterGenerationStatus.COMPLETED,
        );

        this.logger.log(
          `Poster resize completed for projectId: ${projectId}, promptId: ${promptId}`,
        );
      },
      async (error) => {
        // Update project status to FAILED
        await this.posterProjectRepository.updatePosterStatus(
          projectId,
          PosterGenerationStatus.FAILED,
        );
        this.logger.error(
          { error, projectId, promptId },
          `Poster resize failed for projectId: ${projectId}, promptId: ${promptId}`,
        );
      },
    );
  }

  private async prepareSingleFileForDriveUpload({
    contentType,
    fileId,
    index,
  }: {
    fileId: string;
    index: number;
    contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL;
  }): Promise<{
    index: number;
    fileId: string;
    queuePayload: DriveUploadPayload | null;
    rawMedia: RawMedia | null;
    error: Error | null;
  }> {
    let rawMedia: RawMedia | null = null;

    const [preparedData, preparationError] = await this.errorHandler.try(
      async () => {
        const googleDriveFileDetails =
          await this.fetchAndValidateGoogleDriveFileDetails(fileId);

        if (!googleDriveFileDetails.fileExtension) {
          throw new Error(`Missing file extension for file: ${fileId}`);
        }

        const { bucket, filePath, fullFilePath } =
          this.generateFilePathForContentType({
            contentType,
            fileExtension: googleDriveFileDetails.fileExtension,
            fileId,
          });

        rawMedia = await this.createQueuedRawMediaRecord({
          fullFilePath,
          googleDriveFileDetails,
        });

        const queuePayload = this.buildDriveUploadQueuePayload({
          bucket,
          contentType,
          fileId,
          filePath,
          fullFilePath,
          googleDriveFileDetails,
          rawMedia,
        });

        return {
          error: null,
          fileId,
          index,
          queuePayload,
          rawMedia,
        };
      },
    );

    if (preparationError || !preparedData) {
      this.logger.error(
        `Failed to prepare upload job for ${fileId}`,
        preparationError,
      );

      if (rawMedia) {
        await this.markRawMediaRecordAsFailed(rawMedia);
      }

      return {
        error:
          preparationError instanceof Error
            ? preparationError
            : new Error('Unknown error'),
        fileId,
        index,
        queuePayload: null,
        rawMedia,
      };
    }

    return preparedData;
  }

  private async triggerMp4ConversionAndUpdateRawMedia({
    contentType,
    rawMedia,
  }: {
    rawMedia: RawMedia;
    contentType: ContentType.EPISODE | ContentType.SHOW | ContentType.REEL;
  }): Promise<void> {
    const { outputDirectory, sourceFilePath } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType: contentType,
        fileName: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
      });

    const awsMediaConvertTask =
      await this.awsMediaConvertService.triggerConversionJob(
        sourceFilePath,
        outputDirectory,
      );

    rawMedia.transcodingTask.push({
      externalTaskId: awsMediaConvertTask.Job?.Id ?? 'NA',
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
    });

    console.log(
      'Transcoding job triggered for ',
      sourceFilePath,
      outputDirectory,
    );
  }

  private updateContentAndEpisodesWithTranscodingInfo({
    content,
    episodes,
    hls264TaskId,
    hls265TaskId,
    index,
    rawMedia,
    rawMediaId,
  }: {
    content?: Contents[];
    episodes: Episode[];
    hls264TaskId: string;
    hls265TaskId: string;
    index: number;
    rawMedia: RawMedia;
    rawMediaId: string;
  }): void {
    const sourceFileName = MediaFilePathUtils.extractFileNameWithExtension(
      rawMedia.destination.url,
    ).nameWithExtension;
    const duration = rawMedia.durationInSeconds ?? 0;
    const rawMediaIdString = rawMedia._id.toString();

    content?.forEach((contentItem) => {
      contentItem.mediaList[index].visionularHls.rawMediaId = rawMediaId;
      contentItem.mediaList[index].visionularHlsH265.rawMediaId = rawMediaId;
      contentItem.mediaList[index].visionularHls.visionularTaskId =
        hls264TaskId;
      contentItem.mediaList[index].visionularHlsH265.visionularTaskId =
        hls265TaskId;
      contentItem.mediaList[index].duration = duration;
      contentItem.mediaList[index].sourceLink = sourceFileName;
      contentItem.mediaList[index].rawMediaId = rawMediaIdString;
    });

    episodes.forEach((episode) => {
      episode.mediaList[index].visionularHls.rawMediaId = rawMediaId;
      episode.mediaList[index].visionularHlsH265.rawMediaId = rawMediaId;
      episode.mediaList[index].visionularHlsH265.visionularTaskId =
        hls265TaskId;
      episode.mediaList[index].rawMediaId = rawMediaIdString;
      episode.mediaList[index].visionularHls.visionularTaskId = hls264TaskId;
      episode.mediaList[index].duration = duration;
      episode.mediaList[index].sourceLink = sourceFileName;
    });
  }

  private updateRawMediaWithVisionularTask({
    rawMedia,
    visionularTaskId,
  }: {
    rawMedia: RawMedia;
    visionularTaskId: ObjectId;
  }): void {
    rawMedia.transcodingTask.push({
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.VISIONULAR,
      transcodingTaskId: visionularTaskId,
    });

    rawMedia.status = MediaStatusEnum.TRANSCODING_STARTED;
  }

  private validateEpisodesAndContentExist({
    content,
    episodes,
  }: {
    episodes: Episode[];
    content: Contents[];
  }): void {
    if (episodes && episodes.length === 0) {
      throw new Error('Episode not found');
    }

    if (content.length === 0) {
      throw new Error('Content not found');
    }
  }

  async completeMultipartUpload({
    parts,
    rawMediaId,
    uploadId,
  }: CompleteMultipartUploadRequestDto): Promise<void> {
    const rawMedia = await this.rawMediaRepository.findOneOrFail(
      {
        _id: new ObjectId(rawMediaId),
      },
      { failHandler: () => new NotFoundException('Raw media not found') },
    );

    const { s3Bucket, s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(
      rawMedia.destination.url,
    );

    await this.completeMultipartUploadForRawMedia({
      bucket: s3Bucket,
      filePath: s3FileKey,
      parts,
      uploadId,
    });

    rawMedia.status = MediaStatusEnum.UPLOAD_COMPLETED;
    rawMedia.statusHistory.push({
      status: MediaStatusEnum.UPLOAD_COMPLETED,
      timestamp: new Date(),
    });
    await this.rawMediaRepository.save(rawMedia);
  }

  async completeMultipartUploadForRawMedia({
    bucket,
    filePath,
    parts,
    uploadId,
  }: CompleteMultipartUploadForRawMediaParams): Promise<void> {
    await this.s3Service.completeMultipartUpload({
      bucket,
      filePath,
      parts,
      uploadId,
    });
  }

  async extractFrames({
    rawMediaId,

    title,
  }: ExtractFramesRequestDto): Promise<ExtractFramesResponseDto> {
    this.performFrameExtraction(rawMediaId, title);
    return {
      success: true,
    };
  }

  async fetchMp4FileSizes({
    contentType,
    sourceLink,
  }: {
    sourceLink: string;
    contentType: ContentType.SHOW | ContentType.EPISODE;
  }) {
    const MP4_AVAILABLE_RESOLUTIONS: MP4Resolution[] = [
      240, 360, 480, 720, 1080,
    ];
    const { bucket, resolutionFilePaths } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType,
        fileName: sourceLink,
      });

    const result: Record<MP4Resolution, number> = {} as Record<
      MP4Resolution,
      number
    >;

    await Promise.all(
      MP4_AVAILABLE_RESOLUTIONS.map(async (resolution) => {
        const fileSize = await this.s3Service.getS3ObjectSize({
          bucket,
          key: `${resolutionFilePaths[resolution]}${sourceLink}`,
        });
        result[resolution] = fileSize.inMB;
      }),
    );

    return result;
  }

  async generateArtistUploadSignedURL({
    contentType,
    fileExtension,
    fileName,
  }: {
    fileName: string;
    contentType: string;
    fileExtension: string;
  }) {
    const url = await this.s3Service.generateArtistUploadSignedUrl({
      contentType,
      fileExtension,
      fileName,
    });
    return { url };
  }

  async generateFrameUploadUrl({ projectId }: { projectId: string }): Promise<{
    uploadUrl: string;
    viewUrl: string;
  }> {
    const frameId = `frame_manual_${Date.now()}`;
    const fileName = `${frameId}${FRAME_EXTRACTION.FILE_EXTENSION}`;

    const posterProject =
      await this.posterProjectRepository.findProjectById(projectId);

    if (!posterProject) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND('Poster project not found');
    }

    const projectName = CommonUtils.sanitizeString(posterProject.name);
    const { bucket, filePath, fullFilePath } =
      MediaFilePathUtils.generateExtractedFramePath({
        fileName,
        projectId,
        projectName,
      });

    const { signedUrl } = await this.s3Service.generateUploadSignedUrl({
      bucket,
      filePath,
      mimeType: FRAME_EXTRACTION.MIME_TYPE,
    });

    return {
      uploadUrl: signedUrl,
      viewUrl: fullFilePath,
    };
  }

  async generateMultipartUploadUrl({
    fileName,
    fileSize,
    mimeType,
    pathPrefix,
    projectId,
  }: {
    projectId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    pathPrefix: string;
  }): Promise<GenerateQcVideoUploadUrlResponseDto> {
    const { extension: extractedExtension, nameWithoutExtension } =
      MediaFilePathUtils.extractFileNameWithExtension(fileName);

    const sanitizedFileName = CommonUtils.sanitizeString(nameWithoutExtension);

    const { bucket, filePath } = MediaFilePathUtils.generateProjectFilePath({
      fileName: `${sanitizedFileName}${extractedExtension}`,
      pathPrefix,
      projectId,
    });

    const { numberOfParts } = this.calculateMultipartUploadParts(fileSize);

    // Initiate multipart upload
    const { key, uploadId } = await this.s3Service.initiateMultipartUpload({
      bucket,
      filePath,
      mimeType,
    });

    // Generate presigned URLs for all parts
    const partUrls = await Promise.all(
      Array.from({ length: numberOfParts }, async (_, index) => {
        const partNumber = index + 1;
        const uploadUrl = await this.s3Service.generateMultipartUploadPartUrl({
          bucket,
          filePath: key,
          partNumber,
          uploadId,
        });
        return {
          partNumber,
          uploadUrl,
        };
      }),
    );

    const viewUrl = await this.s3Service.generateViewSignedUrl({
      bucket,
      key: filePath,
    });

    const { signedUrl: uploadUrl } =
      await this.s3Service.generateUploadSignedUrl({
        bucket,
        filePath,
        mimeType,
      });

    const newRawMedia = this.rawMediaRepository.create({
      contentType: mimeType,
      destination: {
        url: viewUrl,
      },
      durationInSeconds: 0,
      source: {
        type: SourceTypeEnum.LOCAL_UPLOAD,
      },
      status: MediaStatusEnum.UPLOADING,
      statusHistory: [
        {
          status: MediaStatusEnum.UPLOADING,
          timestamp: new Date(),
        },
      ],
      transcodingTask: [],
      uploadProgress: 0,
    });
    await this.rawMediaRepository.save(newRawMedia);

    return {
      partUrls,
      rawMediaId: newRawMedia._id.toString(),
      uploadId,
      uploadUrl,
      viewUrl,
      bucket,
      filePath,
    };
  }

  async generatePaywallImageUploadUrl({
    fileExtension,
    mimeType,
    paywallId,
  }: CreateImageUrlDto): Promise<CreateThumbnailUploadUrlResponseDto> {
    const fileNameWithoutExtension = `${paywallId}-${new Date().getTime()}`;
    const { bucket, raw } = MediaFilePathUtils.generatePaywallImageFilePath();

    const [{ signedUrl }, viewURL] = await Promise.all([
      this.s3Service.generateUploadSignedUrl({
        bucket,
        filePath: `${raw}/${fileNameWithoutExtension}${sanitizeFileExtension(fileExtension)}`,
        mimeType,
      }),
      this.s3Service.generateViewSignedUrl({
        bucket,
        key: `${raw}/${fileNameWithoutExtension}${sanitizeFileExtension(fileExtension)}`,
      }),
    ]);

    return {
      filename: `${fileNameWithoutExtension}${sanitizeFileExtension(`.${fileExtension}`)}`,
      uploadUrl: signedUrl,
      viewURL,
    };
  }

  async generatePaywallVideoUploadUrl({
    fileExtension,
    fileName,
    mimeType,
  }: {
    fileName: string;
    mimeType: string;
    fileExtension: string;
  }) {
    const newFileName = `${fileName}-${new Date().getTime().toString()}`;
    const { bucket, filePath } =
      MediaFilePathUtils.generateRawPaywallVideoFilePath({
        fileExtension,
        fileName: newFileName,
      });

    const { baseUrl, signedUrl } = await this.s3Service.generateUploadSignedUrl(
      {
        bucket,
        filePath,
        mimeType,
      },
    );

    return {
      baseUrl,
      fileName: `/${APP_CONFIGS.AWS.S3.PAYWALL.VIDEO_FOLDER}/${newFileName}.${fileExtension}`,
      uploadUrl: signedUrl,
    };
  }

  generatePoster(params: GeneratePosterRequestDto): void {
    this.performPosterGeneration(params);
    return;
  }

  async generatePosterVideoUploadSignedURL({
    fileExtension,
    fileName,
    mimeType,
  }: {
    mimeType: string;
    fileExtension: string;
    fileName: string;
  }) {
    const { bucket, filePath } = MediaFilePathUtils.generatePosterVideoFilePath(
      {
        fileExtension,
        fileName,
      },
    );
    const { signedUrl } = await this.s3Service.generateUploadSignedUrl({
      bucket,
      filePath,
      mimeType,
    });
    return { signedUrl };
  }

  async generateShowEpisodeReelMovieUploadUrl({
    contentSlug,
    contentType,
    duration,
    fileExtension,
    mimeType,
  }: GenerateFileUploadUrlRequestDto & {
    contentType:
      | ContentType.EPISODE
      | ContentType.MOVIE
      | ContentType.SHOW
      | ContentType.REEL
      | PeripheralMediaType.TEASER
      | ContentType.POSTER_VIDEO;
  }): Promise<GenerateFileUploadUrlResponseDto> {
    const newRawMedia = await this.rawMediaRepository.createBaseRawMedia({
      contentSlug,
      contentType: mimeType,
      destination: {
        url: '',
      },
      durationInSeconds: duration ? Math.trunc(duration) : 0,
      source: {
        type: SourceTypeEnum.LOCAL_UPLOAD,
      },
      status: MediaStatusEnum.CREATED,
    });

    const { bucket, filePath } = (() => {
      switch (contentType) {
        case ContentType.EPISODE:
          return MediaFilePathUtils.generateRawShowEpisodeFilePath({
            fileExtension,
            fileName: newRawMedia._id.toString(),
          });
        case ContentType.SHOW:
          return MediaFilePathUtils.generateRawShowFilePath({
            fileExtension,
            fileName: newRawMedia._id.toString(),
          });
        case ContentType.MOVIE:
          return MediaFilePathUtils.generateRawMovieFilePath({
            fileExtension,
            fileName: newRawMedia._id.toString(),
          });
        case ContentType.REEL:
          return MediaFilePathUtils.generateRawReelFilePath({
            fileExtension,
            fileName: newRawMedia._id.toString(),
          });
        case ContentType.POSTER_VIDEO:
          return MediaFilePathUtils.generateGenericVideoFilePath({
            contentSlug: newRawMedia._id.toString(),
            fileExtension,
            fileName: newRawMedia._id.toString(),
          });
        default:
          throw new Error('Invalid content type');
      }
    })();

    const { baseUrl, signedUrl } = await this.s3Service.generateUploadSignedUrl(
      {
        bucket,
        filePath,
        mimeType,
      },
    );

    newRawMedia.destination.url = baseUrl;
    newRawMedia.source = {
      type: SourceTypeEnum.LOCAL_UPLOAD,
      url: baseUrl,
    };
    await this.rawMediaRepository.save(newRawMedia);

    return {
      rawMediaId: newRawMedia._id.toString(),
      uploadUrl: signedUrl,
    };
  }

  async generateSubtitleUploadUrl({
    language,
    slug,
  }: {
    language: Lang;
    slug: string;
  }) {
    const { bucket, fileName, filePath } =
      MediaFilePathUtils.generateSubtitleFilePath({ language, slug });
    const { signedUrl } = await this.s3Service.generateUploadSignedUrl({
      bucket,
      filePath,
      mimeType: 'application/x-subrip',
    });
    return {
      fileName: fileName,
      uploadUrl: signedUrl,
    };
  }
  async generateThumbnailUploadUrl({
    contentType,
    fileExtension,
    mimeType,
    orientation,
    ratio,
  }: CreateThumbnailUploadUrlRequestDto): Promise<CreateThumbnailUploadUrlResponseDto> {
    const fileNameWithoutExtension = `${contentType}-${orientation}-${ratio}-${new Date().getTime()}`;
    const { bucket, raw } = MediaFilePathUtils.generateThumbnailFilePath({
      contentType,
      orientation,
    });

    const [{ signedUrl }, viewURL] = await Promise.all([
      this.s3Service.generateUploadSignedUrl({
        bucket,
        filePath: `${raw}/${fileNameWithoutExtension}${sanitizeFileExtension(fileExtension)}`,
        mimeType,
      }),
      this.s3Service.generateViewSignedUrl({
        bucket,
        key: `${raw}/${fileNameWithoutExtension}${sanitizeFileExtension(fileExtension)}`,
      }),
    ]);

    return {
      filename: `${fileNameWithoutExtension}${sanitizeFileExtension('.webp')}`,
      uploadUrl: signedUrl,
      viewURL,
    };
  }

  async getRawMediaStatus({ rawMediaIds }: { rawMediaIds: string }) {
    const rawMediaIdsArray = rawMediaIds.split(',');
    const rawFiles = await this.rawMediaRepository.find({
      _id: { $in: rawMediaIdsArray.map((id) => new ObjectId(id)) },
    });
    return rawFiles.map((rawFile) => ({
      rawMediaId: rawFile._id.toString(),
      status: rawFile.status,
    }));
  }

  async getTranscodingTaskDetails(
    rawMediaIds: string,
  ): Promise<GetTranscodingProgressResponseDto> {
    const rawMediaIdsArray = rawMediaIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const results = await Promise.all(
      rawMediaIdsArray.map(async (rawMediaId) => {
        const rawMedia = await this.rawMediaRepository.findOneOrFail(
          {
            _id: new ObjectId(rawMediaId),
          },
          { failHandler: () => new NotFoundException('File not found') },
        );
        if (
          ![
            MediaStatusEnum.TRANSCODING_COMPLETED,
            MediaStatusEnum.TRANSCODING_STARTED,
          ].includes(rawMedia.status)
        ) {
          throw new Error('Transcoding not started');
        }
        if (
          !rawMedia.transcodingTask?.find((task) => task.transcodingTaskId)
            ?.transcodingTaskId
        ) {
          throw new Error('Transcoding task not found');
        }

        const task = await this.visionularTaskRepository.findAll({
          where: {
            rawMedia: rawMedia._id,
          },
        });

        const taskDetails = await Promise.all(
          task.map(async (task) => {
            const taskDetails =
              await this.visionularService.getTranscodingTaskDetails(
                task.data.task_id,
              );
            return taskDetails;
          }),
        );
        // Calculate average progress from all transcoding tasks
        const totalProgress = taskDetails.reduce((sum, task) => {
          // Assuming task has a progress property, adjust if the actual property name is different
          return sum + (task.data.progress || 0);
        }, 0);

        const averageProgress =
          taskDetails.length > 0 ? totalProgress / taskDetails.length : 0;

        return {
          averageProgress: Math.round(averageProgress * 100) / 100,
          rawMediaId,
          status: rawMedia.status,
        };
      }),
    );
    return {
      progresses: results,
    };
  }

  async getUploadProgress({ rawFileIds }: GetUploadProgressRequestDto) {
    const rawFileIdsArray = rawFileIds.split(',');
    const rawFiles = await this.rawMediaRepository.find({
      _id: { $in: rawFileIdsArray.map((id) => new ObjectId(id)) },
    });
    return rawFiles.map((rawFile) => ({
      fileId: rawFile._id.toString(),
      status: rawFile.status,
      uploadProgress: rawFile.uploadProgress,
    }));
  }

  async handleFrameExtracted({
    frames,
    projectId: rawMediaId,
  }: {
    projectId: string;
    frames: FrameExtractionFrame[];
  }): Promise<void> {
    const rawMedia = await this.rawMediaRepository.findOneOrFail({
      _id: new ObjectId(rawMediaId),
    });

    const successfulFrames = frames.filter(
      (frame): frame is FrameExtractionFrame & { s3Key: string } =>
        frame.success && frame.s3Key !== null && frame.s3Key !== undefined,
    );

    // Find the poster project associated with this rawMedia
    const posterProject = await this.posterProjectRepository.findOne({
      rawMediaId: new ObjectId(rawMediaId),
    });

    if (successfulFrames.length === 0) {
      rawMedia.status = MediaStatusEnum.GENERATING_FRAMES_FAILED;
      await this.rawMediaRepository.save(rawMedia);
      // Update project status to FAILED
      if (posterProject) {
        await this.posterProjectRepository.updateFrameStatus(
          posterProject._id.toString(),
          FrameExtractionStatus.FAILED,
        );
      }
      return;
    }

    rawMedia.status = MediaStatusEnum.GENERATING_FRAMES_COMPLETED;
    await this.rawMediaRepository.save(rawMedia);
    // Update project status to COMPLETED
    if (posterProject) {
      await this.posterProjectRepository.updateFrameStatus(
        posterProject._id.toString(),
        FrameExtractionStatus.COMPLETED,
      );
    }
  }

  async handleFrameExtractionProgress(
    event: FrameExtractionProgressEvent,
  ): Promise<void> {
    const { frames, projectId: rawMediaId, status } = event;

    if (status === FrameExtractionStatusEnum.EXTRACTION_COMPLETE) {
      await this.handleFrameExtracted({
        frames: frames || [],
        projectId: rawMediaId,
      });
    } else if (status === FrameExtractionStatusEnum.EXTRACTION_FAILED) {
      const rawMedia = await this.rawMediaRepository.findOne({
        _id: new ObjectId(rawMediaId),
      });

      if (rawMedia) {
        rawMedia.status = MediaStatusEnum.GENERATING_FRAMES_FAILED;
        await this.rawMediaRepository.save(rawMedia);
      }

      // Update project status to FAILED
      const posterProject = await this.posterProjectRepository.findOne({
        rawMediaId: new ObjectId(rawMediaId),
      });
      if (posterProject) {
        await this.posterProjectRepository.updateFrameStatus(
          posterProject._id.toString(),
          FrameExtractionStatus.FAILED,
        );
      }
    }
  }

  async listExtractedFrames(projectId: string): Promise<{ url: string }[]> {
    const posterProject =
      await this.posterProjectRepository.findProjectById(projectId);

    if (!posterProject) {
      return [];
    }

    const projectName = CommonUtils.sanitizeString(posterProject.name);
    const bucket = S3_BUCKETS.MEDIA_IMAGE;
    // List all frames from projectName directory (includes all subdirectories for backward compat)
    const prefix = `extracted-frames/${projectName}/`;

    const [result] = await this.errorHandler.try(
      async () => {
        const keys = await this.s3Service.listObjects(bucket, prefix);

        const frames = keys
          .filter((key) => key.endsWith('.jpg') || key.endsWith('.png'))
          .map((key) => ({
            url: `https://${bucket}.s3.amazonaws.com/${key}`,
          }));

        return frames;
      },
      (error) => {
        this.logger.error(
          { error, prefix, projectId },
          'Failed to list extracted frames from S3',
        );
      },
    );

    return result || [];
  }

  async listGeneratedPosters(
    projectId: string,
    promptId: string,
  ): Promise<{ url: string }[]> {
    const bucket = S3_BUCKETS.MEDIA_IMAGE;
    const prefix = `posters/${projectId}/${promptId}/`;

    const [result] = await this.errorHandler.try(
      async () => {
        const keys = await this.s3Service.listObjects(bucket, prefix);

        const images = keys
          .filter(
            (key) =>
              key.endsWith('.jpg') ||
              key.endsWith('.jpeg') ||
              key.endsWith('.png') ||
              key.endsWith('.webp'),
          )
          .map((key) => ({
            url: `https://${bucket}.s3.amazonaws.com/${key}`,
          }));

        return images;
      },
      (error) => {
        this.logger.error(
          { error, prefix, projectId, promptId },
          'Failed to list generated posters from S3',
        );
      },
    );

    return result || [];
  }

  async reportFrameUploadStatus({
    rawMediaId,
    success,
  }: {
    rawMediaId: string;
    success: boolean;
  }): Promise<{ success: boolean }> {
    const rawMedia = await this.rawMediaRepository.findOne({
      _id: new ObjectId(rawMediaId),
    });

    if (!rawMedia) {
      throw new BadRequestException(`RawMedia not found: ${rawMediaId}`);
    }

    rawMedia.status = success
      ? MediaStatusEnum.UPLOAD_COMPLETED
      : MediaStatusEnum.UPLOAD_FAILED;

    await this.rawMediaRepository.save(rawMedia);

    return { success: true };
  }

  resizePoster(params: ResizePosterRequestDto): void {
    this.performPosterResize(params);
    return;
  }

  async startTranscodingForAllEpisodes({
    showSlug,
  }: {
    showSlug: string;
  }): Promise<{
    totalEpisodes: number;
  }> {
    const BATCH_SIZE = 10;
    this.logger.log(
      `Starting batch transcoding for all episodes of show: ${showSlug}`,
    );

    const seasons = await this.seasonRepository.find({
      showSlug,
    });

    if (seasons.length === 0) {
      throw new NotFoundException(`No seasons found for show: ${showSlug}`);
    }

    this.logger.log(`Found ${seasons.length} seasons for show: ${showSlug}`);

    let episodes: Episode[] = [];
    let totalEpisodes = 0;

    for (const season of seasons) {
      episodes = await this.episodeRepository.findEpisodesWithRawMediaStatus({
        episodeStatuses: [EpisodeStatus.DRAFT],
        rawMediaStatus: MediaStatusEnum.UPLOAD_COMPLETED,
        seasonId: season._id,
      });

      this.logger.log(
        `Found ${episodes.length} episodes to transcode for show: ${showSlug} and season: ${season.slug}`,
      );

      for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
        const batch = episodes.slice(i, i + BATCH_SIZE);
        this.logger.log(
          `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(episodes.length / BATCH_SIZE)} (${batch.length} episodes)`,
        );

        await Promise.all(
          batch.map(async (episode) => {
            await this.errorHandler.try(async () => {
              await this.startTranscodingForEpisode({
                episodeSlug: episode.slug,
                rawFileId:
                  episode.visionularHls?.rawMediaId ||
                  episode.visionularHlsH265?.rawMediaId,
                showSlug: episode.showSlug,
              });
            });
          }),
        );
        totalEpisodes += batch.length;
      }
    }

    this.logger.log(
      `Batch transcoding completed for show ${showSlug}: ${episodes.length} episodes processed`,
    );

    return {
      totalEpisodes: totalEpisodes,
    };
  }
  async startTranscodingForEpisode({
    episodeSlug,
    rawFileId,
    showSlug,
  }: StartTranscodingForEpisodeRequestDto) {
    const rawMedia = await this.rawMediaRepository.findOneOrFail(
      {
        _id: new ObjectId(rawFileId),
      },
      { failHandler: () => new NotFoundException('File not found') },
    );
    const episodes = await this.episodeRepository.find({
      slug: episodeSlug,
    });

    if (episodes.length === 0) {
      throw new Error('Episode not found');
    }

    const h265TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.SHOW_EPISODE,
        episodeSlug: episodes[0].slug,
        showSlug: showSlug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H265,
      });
    const h264TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.SHOW_EPISODE,
        episodeSlug: episodes[0].slug,
        showSlug: showSlug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H264,
      });

    const transcodingSourceLink = await this.s3Service.generateViewSignedUrl({
      key: rawMedia.destination.url,
    });

    const hls265TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.SHOW_EPISODE,
        outputPath: h265TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H265,
      });

    const hls264TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.SHOW_EPISODE,
        outputPath: h264TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H264,
      });

    rawMedia.transcodingTask.push({
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.VISIONULAR,
      transcodingTaskId: hls265TranscodingTask.visionularTranscodingTask._id,
    });

    rawMedia.status = MediaStatusEnum.TRANSCODING_STARTED;

    episodes.forEach((episode) => {
      episode.visionularHlsH265.visionularTaskId =
        hls265TranscodingTask.visionularTranscodingTask.data.task_id;
      episode.duration = rawMedia.durationInSeconds ?? 0;
      episode.visionularHls.visionularTaskId =
        hls264TranscodingTask.visionularTranscodingTask.data.task_id;
      episode.visionularHlsH265History.push(
        hls265TranscodingTask.visionularTranscodingTask.data.task_id,
      );
      episode.visionularHlsHistory.push(
        hls264TranscodingTask.visionularTranscodingTask.data.task_id,
      );
      episode.visionularHls.rawMediaId = rawMedia._id.toString();
      episode.visionularHlsH265.rawMediaId = rawMedia._id.toString();
      episode.sourceLink = MediaFilePathUtils.extractFileNameWithExtension(
        rawMedia.destination.url,
      ).nameWithExtension;
    });

    const { outputDirectory, sourceFilePath } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType: ContentType.EPISODE,
        fileName: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
      });

    const awsMediaConvertTask =
      await this.awsMediaConvertService.triggerConversionJob(
        sourceFilePath,
        outputDirectory,
        episodes[0].format === ContentFormat.MICRO_DRAMA
          ? VideoAspectRatioEnum.Vertical
          : VideoAspectRatioEnum.Horizontal,
      );

    rawMedia.transcodingTask.push({
      externalTaskId: awsMediaConvertTask.Job?.Id ?? 'NA',
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
    });

    this.logger.debug(
      `Transcoding job triggered for ${rawMedia.destination.url}`,
    );

    await this.episodeRepository.upsertMany(episodes);
    return this.rawMediaRepository.save(rawMedia);
  }
  async startTranscodingForEpisodeTeaser({
    episodeSlug,
    peripheralId,
    rawMediaId,
    showSlug,
  }: {
    rawMediaId: string;
    episodeSlug: string;
    peripheralId: number;
    showSlug: string;
  }) {
    const { content, episodes, rawMedia } =
      await this.fetchRawMediaEpisodesAndContent({
        contentSlug: showSlug,
        episodeSlug,
        rawMediaId,
      });

    this.validateEpisodesAndContentExist({ content, episodes });

    const { h264TranscodingParams, h265TranscodingParams } =
      this.generateTranscodingOutputPaths({
        contentType: VisionularContentType.EPISODE_TEASER,
        episodeSlug,
        rawMediaDestinationUrl: rawMedia.destination.url,
        showSlug,
      });

    const transcodingSourceLink = await this.generateSignedUrlForTranscoding(
      rawMedia.destination.url,
    );

    const { hls264TranscodingTask, hls265TranscodingTask } =
      await this.createVisionularTranscodingTasks({
        contentType: VisionularContentType.EPISODE_PERIPHERAL,
        h264TranscodingParams,
        h265TranscodingParams,
        rawMedia,
        transcodingSourceLink,
      });

    this.updateRawMediaWithVisionularTask({
      rawMedia,
      visionularTaskId: hls265TranscodingTask.visionularTranscodingTask._id,
    });

    const index = this.findMediaListIndexByPeripheralId({
      episodes,
      peripheralId,
    });

    this.updateContentAndEpisodesWithTranscodingInfo({
      episodes,
      hls264TaskId:
        hls264TranscodingTask.visionularTranscodingTask.data.task_id,
      hls265TaskId:
        hls265TranscodingTask.visionularTranscodingTask.data.task_id,
      index,
      rawMedia,
      rawMediaId,
    });

    await this.triggerMp4ConversionAndUpdateRawMedia({
      contentType: ContentType.SHOW,
      rawMedia,
    });

    await this.contentRepository.upsertMany(content);
    return this.rawMediaRepository.save(rawMedia);
  }

  async startTranscodingForMovie({
    movieSlug,
    rawFileId,
  }: StartTranscodingForMovieRequestDto) {
    const rawMedia = await this.rawMediaRepository.findOneOrFail(
      {
        _id: new ObjectId(rawFileId),
      },
      { failHandler: () => new NotFoundException('File not found') },
    );
    const movies = await this.episodeRepository.find({
      slug: movieSlug,
    });

    if (movies.length === 0) {
      throw new Error('Movie not found');
    }

    const h265TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.INDIVIDUAL,
        episodeSlug: movies[0].slug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H265,
      });
    const h264TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.INDIVIDUAL,
        episodeSlug: movies[0].slug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H264,
      });

    const transcodingSourceLink = await this.s3Service.generateViewSignedUrl({
      key: rawMedia.destination.url,
    });

    const hls265TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.INDIVIDUAL,
        outputPath: h265TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H265,
      });

    const hls264TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.INDIVIDUAL,
        outputPath: h264TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H264,
      });

    rawMedia.transcodingTask.push({
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.VISIONULAR,
      transcodingTaskId: hls265TranscodingTask.visionularTranscodingTask._id,
    });

    rawMedia.status = MediaStatusEnum.TRANSCODING_STARTED;

    movies.forEach((movie) => {
      movie.visionularHlsH265.visionularTaskId =
        hls265TranscodingTask.visionularTranscodingTask.data.task_id;
      movie.duration = rawMedia.durationInSeconds ?? 0;
      movie.visionularHls.visionularTaskId =
        hls264TranscodingTask.visionularTranscodingTask.data.task_id;
      movie.visionularHlsH265History.push(
        hls265TranscodingTask.visionularTranscodingTask.data.task_id,
      );
      movie.visionularHlsHistory.push(
        hls264TranscodingTask.visionularTranscodingTask.data.task_id,
      );
      movie.visionularHls.rawMediaId = rawMedia._id.toString();
      movie.visionularHlsH265.rawMediaId = rawMedia._id.toString();
      movie.sourceLink = MediaFilePathUtils.extractFileNameWithExtension(
        rawMedia.destination.url,
      ).nameWithExtension;
      movie.duration = rawMedia.durationInSeconds ?? 0;
    });

    const { outputDirectory, sourceFilePath } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType: ContentType.EPISODE,
        fileName: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
      });

    const awsMediaConvertTask =
      await this.awsMediaConvertService.triggerConversionJob(
        sourceFilePath,
        outputDirectory,
      );

    rawMedia.transcodingTask.push({
      externalTaskId: awsMediaConvertTask.Job?.Id ?? 'NA',
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
    });

    this.logger.debug(
      `Transcoding job triggered for ${rawMedia.destination.url}`,
    );

    await this.episodeRepository.upsertMany(movies);
    return this.rawMediaRepository.save(rawMedia);
  }

  async startTranscodingForMoviePeripherals({
    movieSlug,
    peripheralId,
    rawMediaId,
  }: {
    rawMediaId: string;
    movieSlug: string;
    peripheralId: number;
  }) {
    const { content, episodes, rawMedia } =
      await this.fetchRawMediaEpisodesAndContent({
        contentSlug: movieSlug,
        episodeSlug: movieSlug,
        rawMediaId,
      });

    this.validateEpisodesAndContentExist({ content, episodes });

    const { h264TranscodingParams, h265TranscodingParams } =
      this.generateTranscodingOutputPaths({
        contentType: VisionularContentType.EPISODE_PERIPHERAL,
        episodeSlug: movieSlug,
        rawMediaDestinationUrl: rawMedia.destination.url,
      });

    const transcodingSourceLink = await this.generateSignedUrlForTranscoding(
      rawMedia.destination.url,
    );

    const { hls264TranscodingTask, hls265TranscodingTask } =
      await this.createVisionularTranscodingTasks({
        contentType: VisionularContentType.EPISODE_PERIPHERAL,
        h264TranscodingParams,
        h265TranscodingParams,
        rawMedia,
        transcodingSourceLink,
      });

    this.updateRawMediaWithVisionularTask({
      rawMedia,
      visionularTaskId: hls265TranscodingTask.visionularTranscodingTask._id,
    });

    const index = this.findMediaListIndexByPeripheralId({
      episodes,
      peripheralId,
    });

    this.updateContentAndEpisodesWithTranscodingInfo({
      content,
      episodes,
      hls264TaskId:
        hls264TranscodingTask.visionularTranscodingTask.data.task_id,
      hls265TaskId:
        hls265TranscodingTask.visionularTranscodingTask.data.task_id,
      index,
      rawMedia,
      rawMediaId,
    });

    console.log('H265 Transcoding Params', h265TranscodingParams);
    console.log('H264 Transcoding Params', h264TranscodingParams);

    await this.triggerMp4ConversionAndUpdateRawMedia({
      contentType: ContentType.EPISODE,
      rawMedia,
    });

    await this.contentRepository.upsertMany(content);
    return this.rawMediaRepository.save(rawMedia);
  }

  async startTranscodingForReel({
    rawMediaId,
    reelId,
  }: {
    rawMediaId: string;
    reelId: string;
  }) {
    const [rawMedia, reel] = await Promise.all([
      this.rawMediaRepository.findOneOrFail(
        {
          _id: new ObjectId(rawMediaId),
        },
        { failHandler: () => new NotFoundException('File not found') },
      ),
      this.reelRepository.findOneOrFail(
        {
          _id: new ObjectId(reelId),
        },
        { failHandler: () => new NotFoundException('Reel not found') },
      ),
    ]);
    const transcodingSourceLink = await this.s3Service.generateViewSignedUrl({
      key: rawMedia.destination.url,
    });

    const [h264TranscodingTask, h265TranscodingTask] = await Promise.all(
      [
        VisionularTranscodingTemplate.H264,
        VisionularTranscodingTemplate.H265,
      ].map(async (template) => {
        const { s3Key } =
          MediaFilePathUtils.generateContentTranscodingOutputPath({
            contentSlug: reel.contentSlug,
            contentType: VisionularContentType.REEL,
            reelContentType: reel.contentType,
            reelId: reel.id,
            sourceLink: rawMedia.destination.url,
            transcodingTemplate: template,
          });

        return this.visionularService.createTranscodingForRawMedia({
          contentType: VisionularContentType.REEL,
          outputPath: s3Key,
          rawMedia,
          sourceLink: transcodingSourceLink,
          template,
        });
      }),
    );

    rawMedia.transcodingTask.push({
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.VISIONULAR,
      transcodingTaskId: h265TranscodingTask.visionularTranscodingTask._id,
    });

    console.log('H264 Transcoding Task', reel.visionularHls);

    // Either both have visionular object or both will be empty. Writing or here for more fault handling
    if (reel.visionularHls === null || reel.visionularHlsH265 === null) {
      const baseTranscodingDetails = {
        hlsSourcelink: '',
        rawMediaId: rawMedia._id.toString(),
        sourceLink: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
        status: MediaStatusEnum.TRANSCODING_STARTED,
      };
      reel.visionularHls = {
        ...baseTranscodingDetails,
        visionularTaskId:
          h264TranscodingTask.visionularTranscodingTask.data.task_id,
      };
      reel.visionularHlsH265 = {
        ...baseTranscodingDetails,
        visionularTaskId:
          h265TranscodingTask.visionularTranscodingTask.data.task_id,
      };
    }

    reel.visionularHls.visionularTaskId =
      h264TranscodingTask.visionularTranscodingTask.data.task_id;
    reel.visionularHlsH265.visionularTaskId =
      h265TranscodingTask.visionularTranscodingTask.data.task_id;

    const { outputDirectory, sourceFilePath } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType: ContentType.REEL,
        fileName: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
      });

    console.log('Source File Path', sourceFilePath);
    console.log('Mp4 Output Directory', outputDirectory);

    await this.awsMediaConvertService.triggerConversionJob(
      sourceFilePath,
      outputDirectory,
      VideoAspectRatioEnum.Horizontal,
    );

    rawMedia.status = MediaStatusEnum.TRANSCODING_STARTED;

    await this.reelRepository.save(reel);
    await this.rawMediaRepository.save(rawMedia);
  }

  async startTranscodingForShowPeripherals({
    peripheralId,
    rawMediaId,
    showSlug,
  }: {
    rawMediaId: string;
    showSlug: string;
    peripheralId: number;
  }) {
    const [rawMedia, shows, content] = await Promise.all([
      this.rawMediaRepository.findOneOrFail(
        {
          _id: new ObjectId(rawMediaId),
        },
        { failHandler: () => new NotFoundException('File not found') },
      ),
      this.showRepository.find({
        slug: showSlug,
      }),
      this.contentRepository.find({
        slug: showSlug,
      }),
    ]);

    if (shows && shows.length === 0) {
      throw new Error('Show not found');
    }

    if (content.length === 0) {
      throw new Error('Content not found');
    }
    const h264TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.SHOW_PERIPHERAL,
        showSlug: showSlug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H264,
      });
    const h265TranscodingParams =
      MediaFilePathUtils.generateContentTranscodingOutputPath({
        contentType: VisionularContentType.SHOW_PERIPHERAL,
        showSlug: showSlug,
        sourceLink: rawMedia.destination.url,
        transcodingTemplate: VisionularTranscodingTemplate.H265,
      });

    const transcodingSourceLink = await this.s3Service.generateViewSignedUrl({
      key: rawMedia.destination.url,
    });

    const hls265TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.SHOW_PERIPHERAL,
        outputPath: h265TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H265,
      });

    const hls264TranscodingTask =
      await this.visionularService.createTranscodingForRawMedia({
        contentType: VisionularContentType.SHOW_PERIPHERAL,
        outputPath: h264TranscodingParams.s3Key,
        rawMedia,
        sourceLink: transcodingSourceLink,
        template: VisionularTranscodingTemplate.H264,
      });

    rawMedia.transcodingTask.push({
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.VISIONULAR,
      transcodingTaskId: hls265TranscodingTask.visionularTranscodingTask._id,
    });

    rawMedia.status = MediaStatusEnum.TRANSCODING_STARTED;

    const index = shows[0].mediaList.findIndex(
      (media) => media.id === peripheralId,
    );

    if (index === -1) {
      throw new Error('Invalid peripheral Id');
    }

    content.forEach((content) => {
      // Update in media list
      content.mediaList[index].visionularHls.rawMediaId = rawMediaId;
      content.mediaList[index].visionularHlsH265.rawMediaId = rawMediaId;
      content.mediaList[index].visionularHls.visionularTaskId =
        hls264TranscodingTask.visionularTranscodingTask.data.task_id;
      content.mediaList[index].visionularHlsH265.visionularTaskId =
        hls265TranscodingTask.visionularTranscodingTask.data.task_id;
      content.mediaList[index].sourceLink =
        MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension;
      content.mediaList[index].rawMediaId = rawMediaId;
      content.mediaList[index].duration = rawMedia.durationInSeconds ?? 0;
      // Update in selected peripheral
    });

    shows.forEach((show) => {
      // Update in media list
      show.mediaList[index].visionularHls.rawMediaId = rawMediaId;
      show.mediaList[index].visionularHlsH265.rawMediaId = rawMediaId;
      show.mediaList[index].visionularHlsH265.visionularTaskId =
        hls265TranscodingTask.visionularTranscodingTask.data.task_id;
      show.mediaList[index].rawMediaId = rawMediaId;
      show.mediaList[index].visionularHls.visionularTaskId =
        hls264TranscodingTask.visionularTranscodingTask.data.task_id;
      show.mediaList[index].duration = rawMedia.durationInSeconds ?? 0;
      show.mediaList[index].sourceLink =
        MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension;
    });

    console.log('content----->', content[0].mediaList[index]);
    console.log('shows----->', content);

    console.log('H265 Transcoding Params', h265TranscodingParams);
    console.log('H264 Transcoding Params', h264TranscodingParams);

    const { outputDirectory, sourceFilePath } =
      MediaFilePathUtils.generateMp4OutputFilePath({
        contentType: ContentType.SHOW,
        fileName: MediaFilePathUtils.extractFileNameWithExtension(
          rawMedia.destination.url,
        ).nameWithExtension,
      });

    const awsMediaConvertTask =
      await this.awsMediaConvertService.triggerConversionJob(
        sourceFilePath,
        outputDirectory,
      );

    rawMedia.transcodingTask.push({
      externalTaskId: awsMediaConvertTask.Job?.Id ?? 'NA',
      taskStatus: TaskStatusEnum.IN_PROGRESS,
      taskType: TranscodingTaskTypeEnum.VIDEO_TRANSCODING,
      transcodingEngine: TranscodingEngineEnum.AWS_MEDIA_CONVERT,
    });

    console.log(
      'Transcoding job triggered for ',
      sourceFilePath,
      outputDirectory,
    );

    await this.contentRepository.upsertMany(content);
    return this.rawMediaRepository.save(rawMedia);
  }

  async transformImage({
    contentType,
    orientation,
    ratio,
    sourceLink,
  }: TransformThumbnailImageRequestDto) {
    const config = CMS_CONFIG.IMAGE_CONFIG[orientation](ratio);
    const { nameWithoutExtension } =
      MediaFilePathUtils.extractFileNameWithExtension(sourceLink);

    const sourceFileBucketPath = await this.s3Service.generateViewSignedUrl({
      key: sourceLink,
    });

    for (const [size, value] of Object.entries(config) as [
      keyof typeof config,
      (typeof config)[keyof typeof config],
    ][]) {
      const filePath = MediaFilePathUtils.generateThumbnailFilePath({
        contentType,
        orientation: orientation,
      });

      const transformedImageBuffer = await this.imageService.transformImage({
        source: sourceFileBucketPath,
        width: value.width,
      });

      const imageBuffer = Buffer.from(transformedImageBuffer);

      console.log('Transformed image uploading to ', filePath);

      await Promise.all(
        [
          this.s3Service.uploadFileBuffer({
            bucket: filePath.bucket,
            buffer: imageBuffer,
            filePath: `${filePath[size as keyof typeof filePath]}/${nameWithoutExtension}.webp`, // bit hacky but works!
            mimeType: `image/webp`,
          }),
          // Copy the large image to the raw folder as well. Used for various purpose, eg partner integrations
          size === 'large'
            ? this.s3Service.uploadFileBuffer({
                bucket: filePath.bucket,
                buffer: imageBuffer,
                filePath: `${filePath.raw}/${nameWithoutExtension}.webp`,
                mimeType: `image/webp`,
              })
            : undefined,
        ].filter(Boolean),
      );
    }
  }

  async transformPaywallImage({
    sourceLink,
    width,
  }: {
    sourceLink: string;
    width: number;
  }) {
    const transformedImageBuffer = await this.imageService.transformImage({
      source: sourceLink,
      width: width,
    });

    const imageBuffer = Buffer.from(transformedImageBuffer);

    const { nameWithoutExtension } =
      MediaFilePathUtils.extractFileNameWithExtension(sourceLink);

    await this.s3Service.uploadFileBuffer({
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      buffer: imageBuffer,
      filePath: `${APP_CONFIGS.AWS.S3.PAYWALL.IMAGE_FOLDER}/${nameWithoutExtension}.webp`,
      mimeType: `image/webp`,
    });

    return `/${APP_CONFIGS.AWS.S3.PAYWALL.IMAGE_FOLDER}/${nameWithoutExtension}.webp`;
  }

  async updateFileUploadProgress({
    rawMediaId,
    uploadProgress,
  }: UpdateFileUploadProgressRequestDto) {
    const rawMedia = await this.rawMediaRepository.findOneOrFail({
      _id: new ObjectId(rawMediaId),
    });
    rawMedia.uploadProgress = uploadProgress;
    rawMedia.status =
      uploadProgress === 100
        ? MediaStatusEnum.UPLOAD_COMPLETED
        : MediaStatusEnum.UPLOADING;
    await this.rawMediaRepository.save(rawMedia);
  }

  async updateFileUploadStatus({
    fileId,
    status,
  }: {
    fileId: string;
    status:
      | MediaStatusEnum.UPLOADING
      | MediaStatusEnum.UPLOAD_COMPLETED
      | MediaStatusEnum.UPLOAD_FAILED;
  }) {
    const rawMedia = await this.rawMediaRepository.findOneOrFail({
      _id: new ObjectId(fileId),
    });
    rawMedia.status = status;
    return this.rawMediaRepository.save(rawMedia);
  }

  async uploadContentFromGoogleDrive({
    contentType,
    fileIds,
  }: {
    fileIds: string[];
    contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL;
  }): Promise<
    {
      googleDriveFileId: string;
      rawMediaId?: string;
      error?: string;
    }[]
  > {
    if (!fileIds?.length) throw new Error('No file IDs provided');

    interface PreparedFileData {
      error: Error | null;
      fileId: string;
      index: number;
      queuePayload: DriveUploadPayload | null;
      rawMedia: RawMedia | null;
    }

    const BATCH_SIZE = 10;
    const preparedFiles: PreparedFileData[] = [];

    for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
      const batch = fileIds.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (fileId, batchIndex) =>
          this.prepareSingleFileForDriveUpload({
            contentType,
            fileId,
            index: i + batchIndex,
          }),
        ),
      );

      preparedFiles.push(...batchResults);
    }

    const sortedPreparedFiles = preparedFiles.sort(
      (first, second) => first.index - second.index,
    );

    return this.dispatchPreparedUploadJobsInOrder(sortedPreparedFiles);
  }
}
