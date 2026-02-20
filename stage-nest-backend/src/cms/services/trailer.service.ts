import { ObjectId } from '@mikro-orm/mongodb';
import { Injectable, Logger } from '@nestjs/common';

import {
  CreateTrailerProjectRequestDto,
  CreateTrailerProjectResponseDto,
  CreateTrailerUploadUrlRequestDto,
  CreateTrailerUploadUrlResponseDto,
  GenerateTrailerRequestDto,
  GenerateTrailerResponseDto,
  GetAllTrailerProjectsQueryDto,
  TrailerCompleteMultipartUploadRequestDto,
  TrailerProgressEvent,
  TrailerProjectDetailDto,
  TrailerProjectListItemDto,
  TrailerStatusResponseDto,
  TrailerUploadProgressRequestDto,
} from '../dtos/trailer.dto';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { TrailerProjectRepository } from '../repositories/trailer-project.repository';
import { TrailerVariantRepository } from '../repositories/trailer-variant.repository';
import { FileManagerService } from './file-manager.service';
import { TaskExecutionService } from './task-execution.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { S3Service } from '@app/storage';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';
import {
  TrailerStatusEnum,
  TrailerStatusTypeEnum,
} from 'common/entities/raw-media.entity';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

@Injectable()
export class TrailerService {
  private readonly logger = new Logger(TrailerService.name);
  constructor(
    private readonly trailerProjectRepository: TrailerProjectRepository,
    private readonly trailerVariantRepository: TrailerVariantRepository,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly taskExecutionService: TaskExecutionService,
    private readonly fileManagerService: FileManagerService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly s3Service: S3Service,
  ) {}

  private async fetchNarrativeJson(s3Key: string): Promise<{
    narrativeVariants?: {
      id: string;
      title?: string;
      confidence?: number;
      actual_duration?: number;
      target_duration?: number;
      structure?: {
        phases?: string[];
        hook_strength?: number;
        cliffhanger?: string;
        description?: string;
      };
      shot_sequence?: {
        order: number;
        scene_ref?: string;
        timecode_start?: string;
        timecode_end?: string;
        recommended_duration?: number;
        purpose?: string;
        audio_recommendation?: string;
        dialogue_line?: string | null;
        transition_in?: string;
        is_hook_ending?: boolean;
      }[];
      music_recommendation?: {
        style?: string;
        has_dialogue_gaps?: boolean;
      };
      text_overlays?: {
        text?: string;
        phase?: string;
        timing?: number;
      }[];
      opening_hook?: string;
      closing_tag?: string;
      suspense_peak?: number;
      character_intro_present?: boolean;
      hook_ending_present?: boolean;
      production_ready?: boolean;
      trailerVideo?: {
        duration?: number;
        fileSize?: number;
      };
    }[];
  } | null> {
    try {
      const jsonString = await this.s3Service.downloadFileContentAsString({
        bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        key: s3Key,
      });
      return JSON.parse(jsonString);
    } catch (err) {
      console.error(`Failed to fetch/parse narrative JSON from ${s3Key}:`, err);
      return null;
    }
  }

  private async updateRawMediaTrailerStatus(
    rawMediaId: string,
    status: TrailerStatusEnum,
    statusType: TrailerStatusTypeEnum,
    progress: number,
  ): Promise<void> {
    const rawMedia = await this.rawMediaRepository.findOne({
      _id: new ObjectId(rawMediaId),
    });

    if (!rawMedia) return;

    rawMedia.aiTrailer = {
      progress,
      status,
      statusType,
    };

    await this.rawMediaRepository.getEntityManager().flush();
  }

  async completeMultipartUpload(
    request: TrailerCompleteMultipartUploadRequestDto,
  ): Promise<void> {
    await this.fileManagerService.completeMultipartUploadForRawMedia({
      bucket: request.bucket,
      filePath: request.filePath,
      parts: request.parts,
      uploadId: request.uploadId,
    });

    // CRITICAL FIX: Set the destination URL on RawMedia after upload completes
    if (request.rawMediaId) {
      const rawMedia = await this.rawMediaRepository.findOne({
        _id: new ObjectId(request.rawMediaId),
      });

      if (rawMedia) {
        // Construct the S3 URL
        const s3Url = `https://${request.bucket}.s3.${APP_CONFIGS.AWS.S3.REGION}.amazonaws.com/${request.filePath}`;
        rawMedia.destination = {
          ...rawMedia.destination,
          url: s3Url,
        };
        await this.rawMediaRepository.getEntityManager().flush();
        this.logger.log(`✅ Set destination URL for rawMedia ${request.rawMediaId}: ${s3Url}`);
      }
    }
  }

  async createProject(
    body: CreateTrailerProjectRequestDto,
  ): Promise<CreateTrailerProjectResponseDto> {
    const existingProject = await this.trailerProjectRepository.findOne({
      projectId: body.projectId,
    });

    if (existingProject) {
      return {
        contentMetadata: existingProject.contentMetadata,
        contentSlug: existingProject.contentSlug,
        projectId: existingProject.projectId,
        rawMediaId: existingProject.rawMediaId?.toString(),
        startedAt: existingProject.startedAt,
      };
    }

    const project = await this.trailerProjectRepository.createProject({
      contentMetadata: body.contentMetadata,
      contentSlug: body.contentSlug,
      projectId: body.projectId,
      rawMediaId: body.rawMediaId,
    });

    return {
      contentMetadata: project.contentMetadata,
      contentSlug: project.contentSlug,
      projectId: project.projectId,
      rawMediaId: project.rawMediaId?.toString(),
      startedAt: project.startedAt,
    };
  }

  async createUploadUrl(
    request: CreateTrailerUploadUrlRequestDto,
  ): Promise<CreateTrailerUploadUrlResponseDto> {
    return await this.fileManagerService.generateMultipartUploadUrl({
      fileName: request.fileName,
      fileSize: request.fileSize,
      mimeType: request.mimeType,
      pathPrefix: 'ai-trailer',
      projectId: request.projectId,
    });
  }

  async generateTrailer(
    body: GenerateTrailerRequestDto,
  ): Promise<GenerateTrailerResponseDto> {
    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({ _id: new ObjectId(body.rawMediaId) }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(`Raw media not found: ${body.rawMediaId}`),
    );

    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({
        rawMediaId: body.rawMediaId,
      }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found for rawMediaId: ${body.rawMediaId}`,
      ),
    );

    await this.updateRawMediaTrailerStatus(
      body.rawMediaId,
      TrailerStatusEnum.PROCESSING,
      TrailerStatusTypeEnum.CREATED,
      0,
    );

    // 4. Extract S3 details from destination URL
    const { s3Bucket, s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(
      rawMedia.destination.url,
    );

    // S3 folder for output trailers and JSON/MD files (ai-trailer prefix)
    const s3TrailerFolderKey = `ai-trailer/${trailerProject.projectId}/trailers`;

    this.errorHandler.try(
      () => {
        console.log('Executing trailer narrative task', {
          contentMetadata: {
            ...body.contentMetadata,
            targetDuration:
              body.targetDuration ?? APP_CONFIGS.TRAILER.DEFAULT_DURATION,
          },
          narrativeStyles: body.narrativeStyles ?? [
            ...APP_CONFIGS.TRAILER.DEFAULT_STYLES,
          ],
          outputOptions: {
            generateTrailerVideos: true,
            outputS3Bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
            trailerFormat: 'mp4',
            trailerResolution: '1080p',
          },
          progressBaseUrl: APP_CONFIGS.TRAILER.PROGRESS_BASE_URL,
          projectId: trailerProject.projectId,
          s3Bucket,
          s3FileKey,
          s3Region: APP_CONFIGS.AWS.S3.REGION,
          s3TrailerFolderKey,
          token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
        });
        this.taskExecutionService.executeTrailerNarrativeTask({
          contentMetadata: {
            ...body.contentMetadata,
            targetDuration:
              body.targetDuration ?? APP_CONFIGS.TRAILER.DEFAULT_DURATION,
          },
          narrativeStyles: body.narrativeStyles ?? [
            ...APP_CONFIGS.TRAILER.DEFAULT_STYLES,
          ],
          outputOptions: {
            generateTrailerVideos: true,
            outputS3Bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
            trailerFormat: 'mp4',
            trailerResolution: '1080p',
          },
          progressBaseUrl: APP_CONFIGS.TRAILER.PROGRESS_BASE_URL,
          projectId: trailerProject.projectId,
          s3Bucket,
          s3FileKey,
          s3Region: APP_CONFIGS.AWS.S3.REGION,
          s3TrailerFolderKey,
          token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
        });
      },
      async (error: Error) => {
        const errorMessage =
          error?.message ?? 'Failed to start trailer generation task';

        await this.trailerProjectRepository.updateOne({
          filter: { projectId: trailerProject.projectId },
          update: { error: errorMessage },
        });

        await this.updateRawMediaTrailerStatus(
          body.rawMediaId,
          TrailerStatusEnum.FAILED,
          TrailerStatusTypeEnum.CREATED,
          0,
        );
      },
    );

    return {
      message: 'Trailer generation started',
      projectId: trailerProject.projectId,
      rawMediaId: body.rawMediaId,
      status: TrailerStatusEnum.PROCESSING,
      statusType: TrailerStatusTypeEnum.CREATED,
    };
  }

  async draftNarrative(
    body: GenerateTrailerRequestDto,
  ): Promise<{ status: string; message: string; projectId: string }> {
    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({ _id: new ObjectId(body.rawMediaId) }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(`Raw media not found: ${body.rawMediaId}`),
    );

    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({
        rawMediaId: body.rawMediaId,
      }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found for rawMediaId: ${body.rawMediaId}`,
      ),
    );

    await this.updateRawMediaTrailerStatus(
      body.rawMediaId,
      TrailerStatusEnum.PROCESSING,
      TrailerStatusTypeEnum.CREATED,
      0,
    );

    const { s3Bucket, s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(
      rawMedia.destination.url,
    );

    const s3TrailerFolderKey = `ai-trailer/${trailerProject.projectId}/narratives`;

    // Execute Phase 1: Draft Narrative
    this.taskExecutionService.executeTrailerNarrativeTask({
      workflowMode: 'draft-narrative', // NEW: Set workflow mode
      contentMetadata: {
        ...body.contentMetadata,
        targetDuration:
          body.targetDuration ?? APP_CONFIGS.TRAILER.DEFAULT_DURATION,
      },
      narrativeStyles: body.narrativeStyles ?? [
        ...APP_CONFIGS.TRAILER.DEFAULT_STYLES,
      ],
      outputOptions: {
        generateTrailerVideos: false, // Don't generate videos in draft phase
        outputS3Bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        trailerFormat: 'mp4',
        trailerResolution: '1080p',
      },
      progressBaseUrl: APP_CONFIGS.TRAILER.PROGRESS_BASE_URL,
      projectId: trailerProject.projectId,
      s3Bucket,
      s3FileKey,
      s3Region: APP_CONFIGS.AWS.S3.REGION,
      s3TrailerFolderKey,
      token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
    });

    return {
      status: 'drafting',
      message: 'Narrative draft generation started',
      projectId: trailerProject.projectId,
    };
  }

  async getNarrativeDraft(
    projectId: string,
  ): Promise<{ draft: any; status: string } | null> {
    const s3Key = `ai-trailer/${projectId}/narratives/narrative_draft.json`;

    try {
      const jsonString = await this.s3Service.downloadFileContentAsString({
        bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        key: s3Key,
      });

      const draft = JSON.parse(jsonString);
      return {
        draft,
        status: 'ready_for_approval',
      };
    } catch (err) {
      this.logger.warn(`Narrative draft not found for project ${projectId}`);
      return null;
    }
  }

  async approveAndGenerateTrailer(body: {
    projectId: string;
    approvedNarrative: any;
    modifications?: any;
  }): Promise<GenerateTrailerResponseDto> {
    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({
        projectId: body.projectId,
      }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found: ${body.projectId}`,
      ),
    );

    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({ _id: trailerProject.rawMediaId }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(
        `Raw media not found: ${trailerProject.rawMediaId}`,
      ),
    );

    if (trailerProject.rawMediaId) {
      await this.updateRawMediaTrailerStatus(
        trailerProject.rawMediaId.toString(),
        TrailerStatusEnum.PROCESSING,
        TrailerStatusTypeEnum.CREATED,
        0,
      );
    }

    const { s3Bucket, s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(
      rawMedia.destination.url,
    );

    const s3TrailerFolderKey = `ai-trailer/${body.projectId}/trailers`;

    // Execute Phase 2: Generate Trailer with approved narrative
    this.taskExecutionService.executeTrailerNarrativeTask({
      workflowMode: 'standard', // Back to standard mode but with approved narrative
      approvedNarrative: body.approvedNarrative, // NEW: Pass approved narrative
      contentMetadata: body.approvedNarrative.contentMetadata || {},
      narrativeStyles: ['approved'], // Use approved style
      outputOptions: {
        generateTrailerVideos: true,
        outputS3Bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        trailerFormat: 'mp4',
        trailerResolution: '1080p',
      },
      progressBaseUrl: APP_CONFIGS.TRAILER.PROGRESS_BASE_URL,
      projectId: body.projectId,
      s3Bucket,
      s3FileKey,
      s3Region: APP_CONFIGS.AWS.S3.REGION,
      s3TrailerFolderKey,
      token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
    });

    return {
      message: 'Trailer generation from approved narrative started',
      projectId: body.projectId,
      rawMediaId: trailerProject.rawMediaId?.toString() || '',
      status: TrailerStatusEnum.PROCESSING,
      statusType: TrailerStatusTypeEnum.CREATED,
    };
  }

  async getNarrativeStatus(projectId: string): Promise<{
    status: string;
    phase: string;
    message?: string;
  }> {
    // Check if narrative draft exists
    const draftExists = await this.getNarrativeDraft(projectId);

    if (draftExists) {
      return {
        status: 'ready',
        phase: 'narrative_draft',
        message: 'Narrative draft ready for approval',
      };
    }

    // Check trailer status
    const trailerProject = await this.trailerProjectRepository.findOne({
      projectId,
    });

    if (!trailerProject) {
      return {
        status: 'not_started',
        phase: 'none',
        message: 'Project not found',
      };
    }

    if (trailerProject.variantIds && trailerProject.variantIds.length > 0) {
      return {
        status: 'completed',
        phase: 'trailer_generated',
        message: 'Trailer generation complete',
      };
    }

    return {
      status: 'processing',
      phase: 'narrative_draft',
      message: 'Processing narrative draft',
    };
  }

  async getAllProjects(
    query: GetAllTrailerProjectsQueryDto,
  ): Promise<PaginatedResponseDTO<TrailerProjectListItemDto>> {
    return await this.trailerProjectRepository.findAllProjects({
      contentSlug: query.contentSlug,
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      sortOrder: query.sortOrder,
    });
  }

  async getTrailerProjectDetail(
    projectId: string,
  ): Promise<TrailerProjectDetailDto | null> {
    const trailerProject = await this.trailerProjectRepository.findOne({
      projectId,
    });

    if (!trailerProject) return null;

    const variants = await this.trailerVariantRepository.find({
      trailerProjectId: trailerProject._id,
    });

    // Generate signed URLs for editor guide and narrative JSON if keys exist
    let editorGuideUrl: string | undefined;
    let narrativeJsonUrl: string | undefined;

    if (trailerProject.editorGuideS3Key) {
      editorGuideUrl = await this.s3Service.generateViewSignedUrl({
        bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        key: trailerProject.editorGuideS3Key,
      });
    }

    if (trailerProject.narrativeJsonS3Key) {
      narrativeJsonUrl = await this.s3Service.generateViewSignedUrl({
        bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
        key: trailerProject.narrativeJsonS3Key,
      });
    }

    // Generate signed URLs for all variants
    const variantsWithSignedUrls = await Promise.all(
      (variants ?? []).map(async (v) => {
        let signedUrl: string | undefined;
        if (v.s3Key) {
          try {
            console.log(
              `Generating signed URL for variant ${v.variantId}, s3Key: ${v.s3Key}`,
            );
            signedUrl = await this.s3Service.generateViewSignedUrl({
              bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
              key: v.s3Key,
            });
            console.log(
              `Generated signed URL for variant ${v.variantId}: ${signedUrl?.substring(0, 100)}...`,
            );
          } catch (err) {
            console.error(
              `Failed to generate signed URL for variant ${v.variantId}:`,
              err,
            );
          }
        } else {
          console.log(`No s3Key for variant ${v.variantId}`);
        }
        return {
          confidence: v.confidence,
          duration: v.duration,
          fileSize: v.fileSize,
          id: v.variantId,
          metadata: v.metadata,
          s3Key: v.s3Key,
          signedUrl,
          style: v.style,
          title: v.title,
        };
      }),
    );

    return {
      completedAt: trailerProject.completedAt,
      contentMetadata: trailerProject.contentMetadata,
      contentSlug: trailerProject.contentSlug,
      editorGuideUrl,
      error: trailerProject.error,
      narrativeJsonUrl,
      projectId: trailerProject.projectId,
      rawMediaId: trailerProject.rawMediaId?.toString(),
      recommendations: trailerProject.recommendations,
      sourceLink: trailerProject.sourceLink,
      startedAt: trailerProject.startedAt,
      variants: variantsWithSignedUrls,
    };
  }

  async getTrailerStatus(projectId: string): Promise<TrailerStatusResponseDto> {
    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({ projectId }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found for projectId: ${projectId}`,
      ),
    );

    const rawMediaId = trailerProject.rawMediaId?.toString();

    const rawMedia = rawMediaId
      ? await this.rawMediaRepository.findOne({
          _id: new ObjectId(rawMediaId),
        })
      : null;

    return {
      error: trailerProject.error,
      progress: rawMedia?.aiTrailer?.progress ?? 0,
      projectId: trailerProject.projectId,
      rawMediaId: rawMediaId ?? '',
      status: rawMedia?.aiTrailer?.status ?? TrailerStatusEnum.IDLE,
      statusType:
        rawMedia?.aiTrailer?.statusType ?? TrailerStatusTypeEnum.CREATED,
    };
  }

  async getVariantDownloadUrl(
    projectId: string,
    variantId: string,
  ): Promise<string> {
    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({ projectId }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found for: ${projectId}`,
      ),
    );

    const variant = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerVariantRepository.findOne({
        trailerProjectId: trailerProject._id,
        variantId,
      }),
      Errors.CMS.TRAILER_NOT_FOUND(`Variant not found: ${variantId}`),
    );

    return this.s3Service.generateViewSignedUrl({
      bucket: APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO,
      key: variant.s3Key,
    });
  }

  async handleTrailerProgressEvent(
    event: TrailerProgressEvent & { projectId: string },
  ): Promise<void> {
    const { error, projectId, recommendations, status } = event;

    const progress = event.progress ?? event.progressPercentage ?? 0;
    const statusType =
      event.statusType ?? event.progressType ?? TrailerStatusTypeEnum.CREATED;

    const variants = event.details?.outputs?.s3Outputs?.trailers;

    const narrativeJsonKey =
      event.details?.outputs?.s3Outputs?.narrative_json?.s3_key;

    const trailerProject = await this.trailerProjectRepository.findOne({
      projectId,
    });

    if (!trailerProject) {
      throw new Error(`TrailerProject not found for projectId: ${projectId}`);
    }

    const rawMediaId = trailerProject.rawMediaId?.toString();

    const isCompleted =
      status === TrailerStatusEnum.COMPLETED ||
      status === TrailerStatusEnum.PROCESSING_COMPLETE;

    if (isCompleted && variants && variants.length > 0) {
      const narrativeVariantsMap = new Map<
        string,
        {
          title?: string;
          confidence?: number;
          duration?: number;
          fileSize?: number;
          metadata?: Record<string, unknown>;
        }
      >();

      if (narrativeJsonKey) {
        const narrativeJson = await this.fetchNarrativeJson(narrativeJsonKey);
        if (narrativeJson?.narrativeVariants) {
          this.errorHandler.try(
            async () => {
              for (const nv of narrativeJson?.narrativeVariants ?? []) {
                narrativeVariantsMap.set(nv.id, {
                  confidence: nv.confidence,
                  duration: nv.trailerVideo?.duration,
                  fileSize: nv.trailerVideo?.fileSize,
                  metadata: {
                    actual_duration: nv.actual_duration,
                    character_intro_present: nv.character_intro_present,
                    closing_tag: nv.closing_tag,
                    hook_ending_present: nv.hook_ending_present,
                    music_recommendation: nv.music_recommendation,
                    opening_hook: nv.opening_hook,
                    production_ready: nv.production_ready,
                    shot_sequence: nv.shot_sequence,
                    structure: nv.structure,
                    suspense_peak: nv.suspense_peak,
                    target_duration: nv.target_duration,
                    text_overlays: nv.text_overlays,
                  },
                  title: nv.title,
                });
              }
            },
            async (error: Error) => {
              this.logger.error('Failed to fetch narrative JSON:', error);
            },
          );
        }
      }

      const variantDocs = variants.map((v) => {
        const narrativeData = narrativeVariantsMap.get(v.variant_id) ?? {};
        return {
          confidence: narrativeData.confidence,
          duration: narrativeData.duration,
          fileSize: narrativeData.fileSize,
          metadata: narrativeData.metadata,
          s3Key: v.s3_key,
          style: v.style,
          title: narrativeData.title,
          trailerProjectId: trailerProject._id,
          variantId: v.variant_id,
        };
      });

      for (const variantDoc of variantDocs) {
        const createdVariant =
          await this.trailerVariantRepository.create(variantDoc);
        await this.trailerProjectRepository.updateOne({
          filter: { projectId },
          update: {
            $push: { variantIds: createdVariant._id },
          },
        });
      }

      const editorGuideS3Key =
        event.details?.outputs?.s3Outputs?.editor_guide?.s3_key;

      await this.trailerProjectRepository.updateOne({
        filter: { projectId },
        update: {
          completedAt: new Date(),
          ...(editorGuideS3Key && { editorGuideS3Key }),
          ...(narrativeJsonKey && { narrativeJsonS3Key: narrativeJsonKey }),
          ...(recommendations && { recommendations }),
        },
      });
    } else if (
      status === TrailerStatusEnum.FAILED ||
      status === TrailerStatusEnum.PROCESSING_FAILED
    ) {
      await this.trailerProjectRepository.updateOne({
        filter: { projectId },
        update: { error: error ?? 'Unknown error' },
      });
    }

    if (rawMediaId) {
      await this.updateRawMediaTrailerStatus(
        rawMediaId,
        status,
        statusType,
        progress,
      );
    }
  }

  async handleUploadProgress(
    request: TrailerUploadProgressRequestDto,
  ): Promise<void> {
    const { progress, projectId, rawMediaId, sourceLink } = request;

    const trailerProject = await this.errorHandler.raiseErrorIfNullAsync(
      this.trailerProjectRepository.findOne({ projectId }),
      Errors.CMS.TRAILER_NOT_FOUND(
        `Trailer project not found for projectId: ${projectId}`,
      ),
    );

    if (
      trailerProject.rawMediaId?.toString() !== rawMediaId ||
      (sourceLink && trailerProject.sourceLink !== sourceLink)
    ) {
      await this.trailerProjectRepository.updateOne({
        filter: { projectId },
        update: {
          rawMediaId: rawMediaId,
          ...(sourceLink && { sourceLink }),
        },
      });
    }

    await this.fileManagerService.updateFileUploadProgress({
      rawMediaId,
      uploadProgress: progress ?? 0,
    });
  }
}
