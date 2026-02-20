import { GeminiAspectRatio } from 'common/interfaces/ai.interface';

import {
  FrameExtractionStatus,
  PosterGenerationStatus,
} from '../entities/poster-project.entity';

// Project status interface
export interface PosterProjectStatusDto {
  frames: FrameExtractionStatus;
  poster: PosterGenerationStatus;
}

// User input interface - matches generation API inputs
export interface UserPromptInputDto {
  customPrompt?: string;
  description?: string;
  emotionType?: string;
  genre?: string;
  imageUrls: string[];
  ratios?: GeminiAspectRatio[];
  style?: string;
  title?: string;
  titleImageUrl?: string;
}

// Prompt response
export interface PromptResponseDto {
  _id: string;
  createdAt: Date;
  userInput: UserPromptInputDto;
  version: number;
}

// Nested generation by prompt
export interface PromptGenerationDto {
  images: { url: string }[];
  prompt: PromptResponseDto;
}

export interface PosterProjectResponseDto {
  _id: string;
  contentSlug?: string;
  createdAt: Date;
  name: string;
  rawMediaId?: string;
  status: PosterProjectStatusDto;
  tags: string[];
  updatedAt: Date;
}

export interface CreatePosterProjectRequestDto {
  contentSlug?: string;
  name: string;
  rawMediaId?: string;
  tags?: string[];
}

export interface UpdatePosterProjectRequestDto {
  contentSlug?: string;
  name?: string;
  rawMediaId?: string;
  tags?: string[];
}

export interface GetPosterProjectByIdResponseDto {
  extractedFrames: { url: string }[];
  posterProject: PosterProjectResponseDto;
  // Legacy - for backward compatibility
  posters: { url: string; rawMediaId: string }[];
  // New - prompt-grouped generations (only populated when imageSource=s3)
  promptGenerations?: PromptGenerationDto[];
}

export interface IFrameExtraction {
  cutInterval: number; // min: 0.1, max: 3600.0
  progressBaseUrl: string;
  projectId: string;
  s3Bucket: string;
  s3FileKey: string;
  s3Region: string;
  s3UploadBucket: string;
  s3UploadDestination: string;
  token: string;
}

// Status polling response
export interface PosterProjectStatusResponseDto {
  projectId: string;
  status: PosterProjectStatusDto;
}
