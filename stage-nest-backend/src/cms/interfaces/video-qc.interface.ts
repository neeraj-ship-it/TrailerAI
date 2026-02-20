import { Issue } from '../dtos/kafka-events.dto';
import { VideoQcStatusEnum } from '../entities/video-qc.entity';
import { PaginatedRequestDTO } from '@app/common/dtos/paginated.request.dto';
import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { MediaStatusEnum } from 'common/entities/raw-media.entity';

export interface GetVideoQcListRequest extends PaginatedRequestDTO {
  projectId?: string;
  status?: VideoQcStatusEnum;
}

export interface VideoQcItem {
  createdAt: Date;
  id: string;
  noOfAttempts: number;
  projectId: string;
  rawMediaId?: string;
  status: VideoQcStatusEnum;
  updatedAt: Date;
}

export interface VideoQcDetail {
  createdAt: Date;
  history: {
    rawMediaId: string;
    status: VideoQcStatusEnum;
    issues: Issue[];
    qcRequestId?: string;
    createdAt: Date;
  }[];
  id: string;
  issues: Issue[];
  noOfAttempts: number;
  projectId: string;
  qcRequestId?: string;
  rawMediaId?: string;
  status: VideoQcStatusEnum;
  updatedAt: Date;
  videoUrl?: string;
}

export type GetVideoQcListResponse = PaginatedResponseDTO<VideoQcItem>;

export interface CreateVideoQcRequest {
  projectId: string;
  rawMediaId?: string;
}

export type CreateVideoQcResponse = VideoQcDetail;

export type GetVideoQcByIdResponse = VideoQcDetail;

export interface HandleVideoUploadProgressRequest {
  progress?: number;
  projectId: string;
  rawMediaId: string;
  status:
    | MediaStatusEnum.UPLOADING
    | MediaStatusEnum.UPLOAD_COMPLETED
    | MediaStatusEnum.UPLOAD_FAILED;
  videoUrl?: string;
}

export interface CompleteMultipartUploadRequest {
  bucket: string;
  filePath: string;
  parts: { ETag: string; PartNumber: number }[];
  rawMediaId: string;
  uploadId: string;
}
