// ============================================================
// Clip Extractor DTOs
// ============================================================

// --- Request DTOs ---

export interface CreateClipExtractorProjectRequestDto {
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

export interface StartClipExtractionRequestDto {
  projectId: string;
}

export interface GetAllClipExtractorProjectsQueryDto {
  page?: number;
  perPage?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

// --- Progress Event (from Python service webhook) ---

export interface ClipExtractorProgressEvent {
  projectId?: string;
  status: string; // processing-initiated, processing-progress, processing-complete, processing-failed
  progressStage?: string; // downloading-video, analyzing-narrative, etc.
  progress?: number; // 0-100
  message?: string;
  details?: ClipExtractorCompletionDetails;
}

export interface ClipExtractorCompletionDetails {
  projectId?: string;
  totalClips?: number;
  clips?: ClipResultFromPython[];
  compiledVideo?: {
    s3Key?: string;
    clipUrl?: string;
    duration?: number;
  };
  reportS3Key?: string;
  totalTimeSeconds?: number;
  error?: string;
}

export interface ClipResultFromPython {
  clipId: string;
  clipName: string;
  fileName: string;
  filePath?: string;
  s3Key?: string;
  clipUrl?: string;
  duration: number;
  score: number;
  beatOrder: number;
  beatType: string;
  emotionalTone: string;
  description: string;
  timecodeStart: string;
  timecodeEnd: string;
  isCompiled: boolean;
  numSegments: number;
  fileSize: number;
}

// --- Response DTOs ---

export interface CreateClipExtractorProjectResponseDto {
  projectId: string;
  videoUrl: string;
  status: string;
  createdAt?: Date;
}

export interface StartClipExtractionResponseDto {
  projectId: string;
  status: string;
  message: string;
}

export interface ClipExtractorStatusResponseDto {
  projectId: string;
  status: string;
  progress: number;
  progressStage?: string;
  error?: string;
}

export interface ClipExtractorClipDto {
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

export interface ClipExtractorProjectDetailDto {
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
  clips: ClipExtractorClipDto[];
  compiledVideoUrl?: string;
  extractionReportUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
}

export interface ClipExtractorProjectListItemDto {
  projectId: string;
  videoUrl: string;
  contentTitle?: string;
  status: string;
  progress: number;
  clipsCount: number;
  createdAt?: Date;
}

// --- Task Execution Message (sent to Python service) ---

export interface ClipExtractorTaskMessage {
  projectId: string;
  videoUrl: string;
  s3Bucket: string;
  s3Region: string;
  s3ClipsOutputFolderKey: string;
  progressBaseUrl: string;
  token: string;
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
