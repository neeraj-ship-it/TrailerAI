// Clip Extractor Types

export enum ClipExtractorStatusEnum {
  IDLE = "idle",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const CLIP_EXTRACTOR_TERMINAL_STATUSES = [
  ClipExtractorStatusEnum.COMPLETED,
  ClipExtractorStatusEnum.FAILED,
];

export interface ClipExtractorClip {
  clipId: string;
  clipUrl?: string;
  s3Key?: string;
  duration: number;
  score: number;
  beatOrder: number;
  beatType: string;
  emotionalTone: string;
  description: string;
  timecodeStart: string;
  timecodeEnd: string;
  isCompiled: boolean;
  fileSize: number;
}

export interface ClipExtractorProjectListItem {
  projectId: string;
  videoUrl: string;
  contentTitle?: string;
  status: string;
  progress: number;
  clipsCount: number;
  createdAt?: string;
}

export interface ClipExtractorProjectDetail {
  projectId: string;
  videoUrl: string;
  contentSlug?: string;
  contentMetadata?: {
    title?: string;
    genre?: string;
    language?: string;
  };
  status: string;
  progress: number;
  progressStage?: string;
  clips: ClipExtractorClip[];
  compiledVideoUrl?: string;
  extractionReportUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface ClipExtractorStatusResponse {
  projectId: string;
  status: string;
  progress: number;
  progressStage?: string;
  error?: string;
}

export interface CreateClipExtractorProjectRequest {
  videoUrl: string;
  contentSlug?: string;
  contentMetadata?: {
    title?: string;
    genre?: string;
    language?: string;
  };
  clipConfig?: {
    numClips?: number;
    minClipDuration?: number;
    maxClipDuration?: number;
    segmentMinDuration?: number;
    segmentMaxDuration?: number;
    generateCompiled?: boolean;
    compiledMaxDuration?: number;
  };
}

export interface CreateClipExtractorProjectResponse {
  projectId: string;
  videoUrl: string;
  status: string;
  createdAt?: string;
}

export interface StartClipExtractionResponse {
  projectId: string;
  status: string;
  message: string;
}

export interface GetClipExtractorListResponse {
  data: ClipExtractorProjectListItem[];
  nextPageAvailable: boolean;
  page: number;
  perPage: number;
}
