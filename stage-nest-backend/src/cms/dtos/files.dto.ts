import { ImageOrientation } from '../interfaces/files.interface';
import { ContentType } from '@app/common/enums/common.enums';
import { ImageRatio } from 'common/enums/media.enum';
import { GeminiAspectRatio } from 'common/interfaces/ai.interface';

export interface GetGoogleDriveFilesRequestDto {
  links: string[];
}

export interface GenerateFileUploadUrlRequestDto {
  contentSlug?: string;
  duration?: number;
  fileExtension: string;
  mimeType: string;
}

export interface GenerateFileUploadUrlResponseDto {
  rawMediaId: string;
  uploadUrl: string;
}

export interface GenerateQcVideoUploadUrlResponseDto {
  partUrls: { partNumber: number; uploadUrl: string }[];
  rawMediaId: string;
  uploadId: string;
  uploadUrl: string;
  viewUrl: string;
  bucket: string;
  filePath: string;
}
export interface UpdateFileUploadProgressRequestDto {
  rawMediaId: string;
  uploadProgress: number;
}

export interface GenerateSubtitleUploadUrlResponseDto {
  fileName: string;
  uploadUrl: string;
}

export interface GetUploadProgressRequestDto {
  rawFileIds: string;
}

export interface StartTranscodingForEpisodeRequestDto {
  episodeSlug: string;
  rawFileId: string;
  showSlug: string;
}

export interface StartTranscodingForMovieRequestDto {
  movieSlug: string;
  rawFileId: string;
}
export interface StartTranscodingForReelRequestDto {
  rawMediaId: string;
  reelId: string;
}
export interface StartTranscodingForEpisodeTeaserRequestDto {
  episodeSlug: string;
  peripheralId: number;
  rawMediaId: string;
  showSlug: string;
}
export interface GoogleDriveFileDto {
  createdTime: string | null;
  id: string | null;
  isFolder: boolean;
  mimeType: string | null;
  modifiedTime: string | null;
  name: string | null;
  owners: string[];
  size: number | null;
  thumbnailLink: string | null;
  webViewLink: string | null;
}

export interface GetGoogleDriveFilesResponseDto {
  files: GoogleDriveFileDto[];
}

export interface CreateThumbnailUploadUrlRequestDto {
  contentType: ContentType;
  fileExtension: string;
  mimeType: string;
  orientation: ImageOrientation;
  ratio: ImageRatio;
}

export interface TransformThumbnailImageRequestDto {
  contentType: ContentType;
  orientation: ImageOrientation;
  ratio: ImageRatio;
  sourceLink: string;
}

export interface CreateThumbnailUploadUrlResponseDto {
  filename: string;
  uploadUrl: string;
  viewURL: string;
}

export interface GetTranscodingProgressResponseDto {
  progresses: {
    rawMediaId: string;
    averageProgress: number;
  }[];
}

export interface ExtractFramesRequestDto {
  rawMediaId: string;
  title?: string;
}

export interface ExtractFramesResponseDto {
  success: boolean;
}

export interface GeneratePosterRequestDto {
  customPrompt?: string;
  description?: string;
  emotionType?: string;
  genre?: string;
  imageUrls: string[];
  projectId: string;
  ratios?: GeminiAspectRatio[];
  style?: string;
  title?: string;
  titleImageUrl?: string;
}

export interface GeneratePosterResponseDto {
  imageUrl: string;
  rawMediaId: string;
}

export interface CreateFrameUploadUrlRequestDto {
  projectId: string;
}

export interface CreateFrameUploadUrlResponseDto {
  uploadUrl: string;
  viewUrl: string;
}

export interface ReportFrameUploadStatusRequestDto {
  rawMediaId: string;
  success: boolean;
}

export interface ReportFrameUploadStatusResponseDto {
  success: boolean;
}

export interface GenerateQcVideoUploadUrlRequestDto {
  fileExtension: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  projectId: string;
}

export interface CompleteMultipartUploadRequestDto {
  parts: { ETag: string; PartNumber: number }[];
  rawMediaId: string;
  uploadId: string;
}

export enum FrameExtractionStatusEnum {
  EXTRACTION_COMPLETE = 'extraction-complete',
  EXTRACTION_FAILED = 'extraction-failed',
  EXTRACTION_INITIATED = 'extraction-initiated',
  EXTRACTION_PROGRESS = 'extraction-progress',
}

export interface FrameExtractionFrame {
  s3Key: string | null;
  success: boolean;
  timestamp: number;
}

export interface FrameExtractionProgressEvent {
  frames?: FrameExtractionFrame[] | null; // Only on completion
  progress: number; // 0-100
  projectId: string;
  status: FrameExtractionStatusEnum;
  token?: string | null;
}

export interface FrameExtractionSuccessResponse {
  duration: number;
  frames: FrameExtractionFrame[];
  projectId: string;
}

export interface FrameExtractionErrorResponse {
  details?: string | null;
  error: string;
  projectId: string | null;
  s3FileKey?: string | null;
}

export interface ResizePosterRequestDto {
  customPrompt?: string;
  projectId: string;
  promptId: string;
  sizes: { height: number; width: number }[];
  sourceUrl: string;
}

export interface ResizePosterResponseDto {
  resizedImages: { height: number; url: string; width: number }[];
}
