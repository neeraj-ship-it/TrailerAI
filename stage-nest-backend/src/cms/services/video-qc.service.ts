import { Injectable } from '@nestjs/common';

import { ObjectId } from '@mikro-orm/mongodb';

import { FilterQuery } from '@mikro-orm/mongodb';

import {
  VideoQcProgressEvent,
  VideoQcRequestedEvent,
} from '../dtos/kafka-events.dto';
import {
  VideoQcEventRequestDto,
  VideoQcEventResponseDto,
  VideoQcProgressResponse,
} from '../dtos/video-qc.dto';
import { VideoQc, VideoQcStatusEnum } from '../entities/video-qc.entity';
import {
  CompleteMultipartUploadRequest,
  CreateVideoQcRequest,
  CreateVideoQcResponse,
  GetVideoQcByIdResponse,
  GetVideoQcListRequest,
  GetVideoQcListResponse,
  HandleVideoUploadProgressRequest,
  VideoQcItem,
} from '../interfaces/video-qc.interface';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { VideoQcRepository } from '../repositories/video-qc.repository';
import {
  mapExternalStatusToMediaStatus,
  mapExternalStatusToVideoQcStatus,
} from '../utils/video-qc.utils';
import { FileManagerService } from './file-manager.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { KafkaService } from '@app/kafka';
import { ProgressTypeEnum } from 'common/entities/raw-media.entity';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

@Injectable()
export class VideoQcService {
  constructor(
    private readonly videoQcRepository: VideoQcRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly fileManagerService: FileManagerService,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly kafkaService: KafkaService,
  ) {}

  private async publishVideoQcEvent(
    event: VideoQcRequestedEvent,
  ): Promise<void> {
    await this.kafkaService.produce<VideoQcRequestedEvent>(
      APP_CONFIGS.KAFKA.CMS_VIDEO_QC_TOPIC,
      [
        {
          value: event,
        },
      ],
    );
  }

  async completeMultipartUpload(
    request: CompleteMultipartUploadRequest,
  ): Promise<void> {
    await this.fileManagerService.completeMultipartUploadForRawMedia({
      bucket: request.bucket,
      filePath: request.filePath,
      parts: request.parts,
      uploadId: request.uploadId,
    });
  }

  async createVideoQc(
    userId: string,
    request: CreateVideoQcRequest,
  ): Promise<CreateVideoQcResponse> {
    const existingVideoQc = await this.videoQcRepository.findOne({
      projectId: request.projectId,
    });
    if (existingVideoQc) {
      throw Errors.CMS.VIDEO_QC.ALREADY_EXISTS(
        `Video QC already exists for project ${request.projectId}`,
      );
    }

    const newVideoQc = this.videoQcRepository.create({
      createdBy: new ObjectId(userId),
      history: [],
      issues: [],
      noOfAttempts: 0,
      projectId: request.projectId,
      rawMediaId: request.rawMediaId,
      status: VideoQcStatusEnum.CREATED,
    });

    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.save(newVideoQc),
      Errors.CMS.VIDEO_QC.CREATION_FAILED('Failed to create video QC record'),
    );

    return {
      createdAt: videoQc.createdAt,
      history: videoQc.history.map((historyItem) => ({
        createdAt: new Date(historyItem.createdAt),
        issues: historyItem.issues,
        rawMediaId: historyItem.rawMediaId,
        status: historyItem.status,
      })),
      id: videoQc.id,
      issues: videoQc.issues,
      noOfAttempts: videoQc.noOfAttempts,
      projectId: videoQc.projectId,
      qcRequestId: videoQc.qcRequestId,
      rawMediaId: videoQc.rawMediaId,
      status: videoQc.status,
      updatedAt: videoQc.updatedAt,
      videoUrl: videoQc.videoUrl,
    };
  }

  async getVideoQcById(
    userId: string,
    videoQcId: string,
  ): Promise<GetVideoQcByIdResponse> {
    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.findOne(
        {
          _id: new ObjectId(videoQcId),
          createdBy: new ObjectId(userId),
        },
        {
          populate: ['createdBy'],
        },
      ),
      Errors.CMS.VIDEO_QC.NOT_FOUND('Video QC record not found'),
    );

    return {
      createdAt: videoQc.createdAt,
      history: videoQc.history.map((historyItem) => ({
        createdAt: new Date(historyItem.createdAt),
        issues: historyItem.issues,
        rawMediaId: historyItem.rawMediaId,
        status: historyItem.status,
      })),
      id: videoQc.id,
      issues: videoQc.issues,
      noOfAttempts: videoQc.noOfAttempts,
      projectId: videoQc.projectId,
      qcRequestId: videoQc.qcRequestId,
      rawMediaId: videoQc.rawMediaId,
      status: videoQc.status,
      updatedAt: videoQc.updatedAt,
      videoUrl: videoQc.videoUrl,
    };
  }

  async getVideoQcListForUser(
    userId: string,
    request: GetVideoQcListRequest,
  ): Promise<GetVideoQcListResponse> {
    const page = request.page ?? 1;
    const perPage = request.perPage ?? 10;
    const limit = perPage;
    const offset = (page - 1) * perPage;

    const filterQuery: FilterQuery<VideoQc> = {
      createdBy: new ObjectId(userId),
    };

    if (request.projectId) {
      filterQuery.projectId = request.projectId;
    }

    if (request.status) {
      filterQuery.status = request.status;
    }

    const [items, total] = await Promise.all([
      this.videoQcRepository.find(filterQuery, {
        limit,
        offset,
        orderBy: { createdAt: 'desc' },
        populate: ['createdBy'],
      }),
      this.videoQcRepository.count(filterQuery),
    ]);

    if (!items)
      throw Errors.CMS.VIDEO_QC.LIST_FETCH_FAILED(
        'Failed to fetch video QC list',
      );

    const mappedItems: VideoQcItem[] = items.map((item) => ({
      createdAt: item.createdAt,
      id: item.id,
      noOfAttempts: item.noOfAttempts,
      projectId: item.projectId,
      rawMediaId: item.rawMediaId,
      status: item.status,
      updatedAt: item.updatedAt,
    }));

    const totalPages = Math.ceil(total / perPage);
    const nextPageAvailable = page < totalPages;

    return {
      data: mappedItems,
      nextPageAvailable,
      page,
      perPage,
    };
  }

  async getVideoQcProgress(
    projectId: string,
  ): Promise<VideoQcProgressResponse> {
    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.findOne({ projectId }),
      Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Video QC not found for project ${projectId}`,
      ),
    );

    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({
        _id: new ObjectId(videoQc.rawMediaId),
      }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(
        `Raw media not found: ${videoQc.rawMediaId}`,
      ),
    );

    return {
      issues: videoQc.issues ?? [],
      projectId: videoQc.projectId,
      qcProgress: rawMedia.qcProgress ?? 0,
      qcProgressType: rawMedia.qcProgressType ?? ProgressTypeEnum.DOWNLOAD,
      qcStatus: videoQc.status,
    };
  }

  async handleVideoQcProgressEvent(event: VideoQcProgressEvent): Promise<void> {
    const {
      issues,
      progressPercentage,
      progressType,
      projectId,
      status: externalStatus,
    } = event;

    const videoQcStatus = mapExternalStatusToVideoQcStatus(
      externalStatus,
      progressType,
      issues ?? [],
    );
    const qcStatus = mapExternalStatusToMediaStatus(externalStatus);

    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.findOne({ projectId: projectId }),
      Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Video QC not found for projectId: ${projectId}`,
      ),
    );

    if (!videoQc.rawMediaId) {
      throw Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Raw media ID not found for video QC: ${projectId}`,
      );
    }

    const rawMediaId = videoQc.rawMediaId;

    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({
        _id: new ObjectId(rawMediaId),
      }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(`Raw media not found: ${rawMediaId}`),
    );

    const hasQcstatusChanged = videoQc.status !== videoQcStatus;

    if (hasQcstatusChanged) {
      videoQc.status = videoQcStatus;
      videoQc.history.push({
        createdAt: new Date().toISOString(),
        issues: issues ?? [],
        rawMediaId,
        status: videoQcStatus,
      });
    }
    videoQc.issues = issues ?? [];
    await this.videoQcRepository.save(videoQc);

    const shouldUpdateRawMedia =
      rawMedia.qcStatus !== qcStatus ||
      rawMedia.qcProgressType !== progressType ||
      rawMedia.qcProgress !== progressPercentage;

    if (shouldUpdateRawMedia) {
      rawMedia.qcStatus = qcStatus;
      rawMedia.qcProgressType = progressType;
      rawMedia.qcProgress = progressPercentage;
      await this.rawMediaRepository.save(rawMedia);
    }
  }

  async handleVideoUploadProgress(
    request: HandleVideoUploadProgressRequest,
  ): Promise<void> {
    const { progress, projectId, rawMediaId, videoUrl } = request;

    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.findOne({ projectId }),
      Errors.CMS.VIDEO_QC.NOT_FOUND(
        `No Video QC found for project ${projectId}`,
      ),
    );

    if (videoQc.rawMediaId !== rawMediaId) {
      videoQc.rawMediaId = rawMediaId;
      if (videoUrl) {
        videoQc.videoUrl = videoUrl;
      }
    }

    await this.videoQcRepository.save(videoQc);

    await this.fileManagerService.updateFileUploadProgress({
      rawMediaId,
      uploadProgress: progress ?? 0,
    });
  }

  async initiateVideoQc(
    payload: VideoQcEventRequestDto,
  ): Promise<VideoQcEventResponseDto> {
    const videoQc = await this.errorHandler.raiseErrorIfNullAsync(
      this.videoQcRepository.findOne({
        projectId: payload.projectId,
      }),
      Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Video QC not found for project ${payload.projectId}`,
      ),
    );

    if (!videoQc.rawMediaId) {
      throw Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Raw media ID not found for project ${payload.projectId}`,
      );
    }

    if (!videoQc.videoUrl) {
      throw Errors.CMS.VIDEO_QC.NOT_FOUND(
        `Video URL not found for project ${payload.projectId}`,
      );
    }

    const rawMedia = await this.errorHandler.raiseErrorIfNullAsync(
      this.rawMediaRepository.findOne({
        _id: new ObjectId(videoQc.rawMediaId),
      }),
      Errors.CMS.RAW_MEDIA.NOT_FOUND(
        `Raw media not found: ${videoQc.rawMediaId}`,
      ),
    );

    videoQc.noOfAttempts++;
    videoQc.status = VideoQcStatusEnum.PENDING;
    await this.videoQcRepository.save(videoQc);

    const { s3Bucket, s3FileKey } = MediaFilePathUtils.parseUrlToRelativePath(
      rawMedia.destination.url,
    );
    const event: VideoQcRequestedEvent = {
      progressBaseUrl: APP_CONFIGS.VIDEO_QC.PROGRESS_BASE_URL,
      projectId: payload.projectId,
      s3Bucket,
      s3FileKey,
      s3Region: APP_CONFIGS.AWS.S3.REGION,
      token: APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET,
    };

    await this.publishVideoQcEvent(event);

    return {
      projectId: payload.projectId,
      topic: APP_CONFIGS.KAFKA.CMS_VIDEO_QC_TOPIC,
    };
  }
}
