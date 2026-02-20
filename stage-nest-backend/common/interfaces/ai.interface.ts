import { ImageRatio } from '../enums/media.enum';

export interface GenerateImageParams {
  aspectRatio?: string;
  images: Buffer[];
  model?: string;
  prompts: string[];
}

export interface GenerateAiImageFromS3UrlsParams {
  imageUrls: string[];
  model?: string;
  outputFileName?: string;
  prompts: string[];
  ratios?: GeminiAspectRatio[];
}

export interface GeminiTextPart {
  text: string;
}

export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type GeminiContentPart = GeminiTextPart | GeminiInlineDataPart;

export interface GeminiImageGenerationRequest {
  contents: {
    parts: GeminiContentPart[];
  }[];
  generationConfig: {
    responseModalities: string[];
    imageConfig: {
      aspectRatio: string;
      imageSize: string;
    };
  };
}

export interface GeminiImageGenerationResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }[];
    };
  }[];
}

export type GeminiImageSize = '1K' | '2K' | '4K';

export type GeminiAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9';

export interface PosterGenerationParams {
  customPrompt?: string;
  description?: string;
  emotion: string;
  genre?: string;
  hasAdditionalRefs: boolean;
  hasTitleImage?: boolean;
  style: string;
  title?: string;
}

export interface RatioAdjustmentParams {
  aspectRatio: string;
  ratio: ImageRatio;
  userPrompt: string;
}
