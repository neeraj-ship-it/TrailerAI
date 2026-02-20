import { Platform } from 'common/enums/app.enum';
import { ImageRatio } from 'common/enums/media.enum';
import { GeminiAspectRatio } from 'common/interfaces/ai.interface';
import { ThumbnailQualityConfig } from 'common/interfaces/appConstants.interface';

export const DecoratorConstants = {
  Admin: 'admin',
  CMS: 'cms',
  Internal: 'internal',
  PartnerLogin: 'partnerLogin',
  PgAuthDecoratorKey: 'pgAuth',
  PlatformPublic: 'platformPublic',
  Privileges: 'privileges',
  Public: 'public',
  SkipGlobalAuth: 'skipGlobalAuth',
};

export const THUMBNAIL_QUALITY_CONFIG: ThumbnailQualityConfig = {
  [Platform.APP]: {
    [ImageRatio.RATIO_16_9]: 'small',
  },
  [Platform.TV]: {
    [ImageRatio.RATIO_16_9]: 'medium',
  },
  [Platform.WEB]: {
    [ImageRatio.RATIO_16_9]: 'small',
  },
};

export const defaultProfileAvatar = {
  bho: '/static/avatars/bho_default.png',
  guj: '/static/avatars/guj_default.png',
  har: '/static/avatars/har_default.png',
  raj: '/static/avatars/raj_default.png',
};

// FFmpeg Configuration Constants
export const FFMPEG_CONFIG_DOCKER = {
  COMMAND: 'ffmpeg',
} as const;

// Frame Extraction Constants
export const FRAME_EXTRACTION = {
  CONTENT_TYPE: 'image/jpeg',
  FILE_EXTENSION: '.jpg',
  MIME_TYPE: 'image/jpeg',
} as const;

// Default aspect ratios for AI poster generation (Gemini-supported ratios)
export const DEFAULT_POSTER_RATIOS: GeminiAspectRatio[] = [
  '2:3',
  '16:9',
  '1:1',
  '3:2',
  '9:16',
  '21:9',
];

// Based on: https://ai.google.dev/gemini-api/docs/image-generation
export const SUPPORTED_GEMINI_ASPECT_RATIOS = new Set<GeminiAspectRatio>([
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
]);
