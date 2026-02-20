export enum VideoQcStatusEnum {
  APPROVED = "qc-approved",
  FAILED = "qc-failed",
  PENDING = "qc-pending",
  PROCESSING = "qc-processing",
  REJECTED = "qc-rejected",
}
export enum RawMediaStatusEnum {
  CREATED = "created",
  QC_APPROVED = "qc-approved",
  QC_FAILED = "qc-failed",
  QC_PENDING = "qc-pending",
  QC_PROCESSING = "qc-processing",
  QC_REJECTED = "qc-rejected",
  QUEUED = "queued",
  TRANSCODING_COMPLETED = "transcoding-completed",
  TRANSCODING_FAILED = "transcoding-failed",
  TRANSCODING_STARTED = "transcoding-started",
  UPLOAD_COMPLETED = "upload-completed",
  UPLOAD_FAILED = "upload-failed",
  UPLOADING = "uploading",
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

export interface PaginatedResponseDTO<T> {
  data: T[];
  nextPageAvailable: boolean;
  page: number;
  perPage: number;
}

export type GetVideoQcListResponse = PaginatedResponseDTO<VideoQcItem>;

export enum QcProgressTypeEnum {
  AUDIO_PROCESSING = "audio-processing",
  COMPRESS = "compress",
  DOWNLOAD = "download",
  VIDEO_PROCESSING = "video-processing",
}

export interface Issue {
  category: string;
  duration: number;
  end: number;
  end_minutes: string;
  start: number;
  start_minutes: string;
}

export interface VideoQcProgressResponse {
  projectId: string;
  qcProgress: number;
  qcProgressType: QcProgressTypeEnum;
  qcStatus: VideoQcStatusEnum;
  issues: Issue[];
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
