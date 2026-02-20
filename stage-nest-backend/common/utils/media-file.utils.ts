import { posix } from 'path';

import {
  GenerateContentTranscodingParams,
  ImageOrientation,
  MP4Resolution,
} from '../../src/cms/interfaces/files.interface';
import { ContentType } from '@app/common/enums/common.enums';
import { THUMBNAIL_QUALITY_CONFIG } from 'common/constants/app.constant';
import { Platform } from 'common/enums/app.enum';
import { ImageRatio } from 'common/enums/media.enum';
import {
  VisionularContentType,
  VisionularTranscodingTemplate,
} from 'common/interfaces/visionular.interface';
import { Thumbnail } from 'src/content/schemas/thumbnail.schema';

import type { SpecialAccessContentThumbnailDto } from '../../src/content/dto/specialAccess.response.dto';
import type { ThumbnailWithRatioDto } from '../../src/content/dto/thumbnail.dto';
import { Errors } from '@app/error-handler';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Lang } from 'common/enums/app.enum';

export const S3_BUCKETS = APP_CONFIGS.AWS.S3.BUCKETS;

export const sanitizeFileExtension = (fileExtension: string) => {
  if (fileExtension.startsWith('.')) {
    return fileExtension;
  }
  return `.${fileExtension}`;
};

export const parseUrlToRelativePath = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url;
  }
  const subscriptionIndex = url.indexOf('/subscription');
  if (subscriptionIndex === -1) {
    return url;
  }
  return url.substring(subscriptionIndex);
};

const extractS3Path = (
  cleanUrl: string,
): { bucket: string; fullPath: string } | null => {
  if (cleanUrl.startsWith('s3://')) {
    const match = cleanUrl.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (match) {
      return { bucket: match[1], fullPath: match[2] };
    }
    return null;
  }

  if (cleanUrl.startsWith('https://')) {
    const s3Match = cleanUrl.match(
      /^https:\/\/([^.]+)\.s3(?:\.[^.]+)?\.amazonaws\.com\/(.+)$/,
    );
    if (s3Match) {
      return { bucket: s3Match[1], fullPath: s3Match[2] };
    }

    const cdnMatch = cleanUrl.match(/^https:\/\/[^/]+\/(.+)$/);
    if (cdnMatch) {
      return {
        bucket: S3_BUCKETS.MAIN_VIDEO,
        fullPath: cdnMatch[1],
      };
    }
  }

  return null;
};

export const MediaFilePathUtils = {
  extractFileNameWithExtension: (filePath: string) => {
    return {
      extension: posix.extname(filePath),
      nameWithExtension: posix.basename(filePath),
      nameWithoutExtension: posix.basename(filePath, posix.extname(filePath)),
    };
  },
  generateArtistImageFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      filePath: `artist/${fileName}${sanitizedFileExtension}`,
    };
  },
  generateContentOnboardingCategoryThumbnailURL: (fileName: string): string => {
    return `${APP_CONFIGS.CDN.URL}/category/${fileName}`;
  },
  generateContentOnboardingOverlayURL: (fileName: string): string => {
    return `${APP_CONFIGS.CDN.URL}/content/onboarding/overlays/${fileName}`;
  },
  generateContentTranscodingOutputPath: (
    params: GenerateContentTranscodingParams,
  ): {
    s3Key: string;
    uniqueFileName: string;
  } => {
    const timestamp = new Date().getTime();
    switch (params.contentType) {
      case VisionularContentType.SHOW_EPISODE: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/show/${params.showSlug}/episodes/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.INDIVIDUAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/individual/${params.episodeSlug}/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.EPISODE_PERIPHERAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/individual/${params.episodeSlug}/trailer/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.SHOW_PERIPHERAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];
        const uniqueFileName = `${params.showSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/show/${params.showSlug}/trailer/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.REEL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];
        const uniqueFileName = `${params.reelId}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/${params.reelContentType}/${params.contentSlug}/reels/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.EPISODE_TEASER: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];
        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/show/${params.showSlug}/teasers/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }

      default: {
        throw new Error('Invalid content type');
      }
    }
  },

  generateExtractedFrameFilePath: ({ fileName }: { fileName: string }) => {
    const bucket = S3_BUCKETS.MEDIA_IMAGE;
    const filePath = `extracted-frames/${fileName}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateExtractedFramePath: ({
    fileName,
    projectId,
    projectName,
  }: {
    fileName?: string;
    projectId: string;
    projectName: string;
  }) => {
    const bucket = S3_BUCKETS.MEDIA_IMAGE;
    const basePath = `${APP_CONFIGS.AWS.S3.EXTRACTED_FRAMES_FOLDER}/${projectName}/${projectId}`;
    const filePath = fileName ? `${basePath}/${fileName}` : basePath;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateGenericVideoFilePath: ({
    contentSlug,
    fileExtension,
    fileName,
  }: {
    contentSlug: string;
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `${APP_CONFIGS.AWS.S3.POSTER_VIDEO_FOLDER}/${contentSlug}/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateHorizontal16x9ThumbnailURL: ({
    contentType,
    platform,
    thumbnail,
  }: {
    contentType: ContentType.MOVIE | ContentType.SHOW | ContentType.EPISODE;
    thumbnail: Thumbnail;
    platform: Platform;
  }) => {
    const subFolderPath = contentType === ContentType.SHOW ? 'show' : 'episode';
    return `${APP_CONFIGS.CDN.URL}/${subFolderPath}/horizontal/${THUMBNAIL_QUALITY_CONFIG[platform][ImageRatio.RATIO_16_9]}/${thumbnail.horizontal.ratio1.sourceLink}`;
  },

  generateImageViewURL: ({
    contentType,
    fileName,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | 'artist';
    fileName: string;
  }) => {
    return `${APP_CONFIGS.CDN.URL}/${contentType}/${fileName}`;
  },

  generateImageViewURLWithOrientation: ({
    contentType,
    fileName,
    orientation,
    size,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | 'artist';
    fileName: string;
    orientation: ImageOrientation;
    size: string;
  }) => {
    return `${APP_CONFIGS.CDN.URL}/${contentType}/${orientation}/${size}/${fileName}`;
  },
  generateImageViewURLWithoutSize: ({
    contentType,
    fileName,
    orientation,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | 'artist';
    fileName: string;
    orientation: ImageOrientation;
  }) => {
    return `${APP_CONFIGS.CDN.URL}/${contentType}/${orientation}/${fileName}`;
  },
  generateMp4OutputFilePath: ({
    contentType,
    fileName,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | ContentType.REEL;
    fileName: string;
  }) => {
    const resolutions: MP4Resolution[] = [240, 360, 480, 720, 1080];
    const bucket =
      contentType === ContentType.REEL
        ? S3_BUCKETS.REEL_BUCKET
        : S3_BUCKETS.MAIN_VIDEO;

    const directory = contentType === ContentType.REEL ? 'reels' : contentType;

    const outputDirectory = `s3://${posix.normalize(
      `${bucket}/${directory}/main-video/`,
    )}`;
    const sourceFilePath = `s3://${posix.normalize(
      `${bucket}/${directory}/main-video/${fileName}`,
    )}`;

    const resolutionFilePaths: Record<MP4Resolution, string> = {} as Record<
      MP4Resolution,
      string
    >;
    const resolutionFilePathsWithFileName: Record<MP4Resolution, string> =
      {} as Record<MP4Resolution, string>;

    resolutions.reduce((acc, resolution) => {
      acc[resolution as MP4Resolution] =
        `${directory}/main-video/${resolution}/`;
      return acc;
    }, resolutionFilePaths);

    resolutions.reduce((acc, resolution) => {
      acc[resolution as MP4Resolution] =
        `s3://${bucket}/${contentType}/main-video/${resolution}/${fileName}`;
      return acc;
    }, resolutionFilePathsWithFileName);

    return {
      bucket,
      outputDirectory,
      resolutionFilePaths,
      resolutionFilePathsWithFileName,
      sourceFilePath,
    };
  },
  generatePaywallImageFilePath: (
    fileName?: string,
  ): {
    bucket: string;
    raw: string;
    sourceLink: string;
  } => {
    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      raw: APP_CONFIGS.AWS.S3.PAYWALL.IMAGE_UPLOAD_FOLDER,
      sourceLink: `https://${S3_BUCKETS.MEDIA_IMAGE}.s3.amazonaws.com/${APP_CONFIGS.AWS.S3.PAYWALL.IMAGE_UPLOAD_FOLDER}/${fileName}`,
    };
  },
  generatePeripheralPlaybackURL: ({
    contentType,
    hls265SourceLink,
    hlsSourceLink,
    slug,
  }: {
    contentType: ContentType.SHOW | ContentType.MOVIE;
    slug: string;
    hlsSourceLink: string;
    hls265SourceLink: string;
  }): {
    playbackURLH264: string;
    playbackURLH265: string;
  } => {
    const { templateDirectory: templateDirectoryHLS } =
      APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
        VisionularTranscodingTemplate.H264
      ];
    const { templateDirectory: templateDirectoryH265 } =
      APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
        VisionularTranscodingTemplate.H265
      ];
    return {
      playbackURLH264: `${APP_CONFIGS.CDN.URL}/trailers/${contentType}/${slug}/trailer/${templateDirectoryHLS}/${hlsSourceLink}`,
      playbackURLH265: `${APP_CONFIGS.CDN.URL}/trailers/${contentType}/${slug}/trailer/${templateDirectoryH265}/${hls265SourceLink}`,
    };
  },

  generatePosterFilename: (title?: string): string => {
    if (!title) {
      return `poster-${Date.now()}`;
    }
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || `poster-${Date.now()}`;
  },

  generatePosterImageFilePath: ({
    fileName,
    projectId,
    promptId,
  }: {
    fileName: string;
    projectId: string;
    promptId: string;
  }): {
    bucket: string;
    filePath: string;
  } => {
    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      filePath: `posters/${projectId}/${promptId}/${fileName}`,
    };
  },

  generatePosterVideoFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const sanitizedFileName = fileName.replace(/^\/+/, '');
    const filePath = posix.normalize(
      `${APP_CONFIGS.AWS.S3.POSTER_VIDEO_FOLDER}/${sanitizedFileName}${sanitizedFileExtension}`,
    );
    return {
      bucket: S3_BUCKETS.MAIN_VIDEO,
      filePath,
      fullFilePath: posix.normalize(
        `https://${S3_BUCKETS.MAIN_VIDEO}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateProjectFilePath: ({
    bucket = S3_BUCKETS.QC_VIDEO,
    fileName,
    pathPrefix,
    projectId,
  }: {
    fileName: string;
    projectId: string;
    pathPrefix: string;
    bucket?: string;
  }) => {
    const sanitizedFileName = fileName.replace(/^\/+/, '');
    const filePath = posix.normalize(
      `${pathPrefix}/${projectId}/${sanitizedFileName}`,
    );
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateRawMovieFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `episode/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateRawPaywallVideoFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `${APP_CONFIGS.AWS.S3.PAYWALL.VIDEO_FOLDER}/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateRawReelFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.REEL_BUCKET;
    const filePath = `reels/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateRawShowEpisodeFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `episode/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateRawShowFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `show/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateRawTeaserFilePath: ({
    episodeSlug,
    fileExtension,
    fileName,
    showSlug,
  }: {
    fileName: string;
    fileExtension: string;
    showSlug: string;
    episodeSlug: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `teasers/show/${showSlug}/${episodeSlug}/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateReelMp4PreviewURL: ({
    fileName,
    reelId,
  }: {
    fileName: string;
    reelId: string;
  }) => {
    const generatedFilePath = MediaFilePathUtils.generateMp4OutputFilePath({
      contentType: ContentType.REEL,
      fileName: reelId,
    });
    console.log(generatedFilePath);
    return `https://${generatedFilePath.bucket}.s3.ap-south-1.amazonaws.com/${generatedFilePath.resolutionFilePaths[480]}${fileName}`;
  },

  generateReelPlaylistFilePath: ({
    contentSlug,
    fileName,
    reelContentType,
    templateDirectory,
  }: {
    reelContentType: ContentType;
    templateDirectory: string;
    contentSlug: string;
    fileName: string;
  }) => {
    const TEMPLATE_DIRECTORY =
      templateDirectory === VisionularTranscodingTemplate.H264
        ? 'HLS'
        : 'HLS-H265';
    console.log(
      APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? 'stagemediaprivate'
        : 'stagetestmediaprivate',
    );
    return {
      bucket: APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? 'stagemediaprivate'
        : 'stagetestmediaprivate',
      filePath: `videos/${reelContentType}/${contentSlug}/reels/${TEMPLATE_DIRECTORY}/${fileName}`,
    };
  },

  generateSubtitleFilePath: ({
    language,
    slug,
  }: {
    slug: string;
    language: Lang;
  }) => {
    const filename = `${slug}-${language}-${new Date().getTime()}`;
    return {
      bucket: S3_BUCKETS.SUBTITLE,
      fileName: `${filename}.srt`,
      filePath: posix.join('episode/srt/'),
    };
  },
  generateThumbnailFilePath: ({
    contentType,
    orientation,
  }: {
    orientation: ImageOrientation;
    contentType: ContentType;
  }): {
    bucket: string;
    large: string;
    'semi-large': string;
    medium: string;
    raw: string;
    small: string;
  } => {
    const orientationPath = `${contentType}/${orientation}`;

    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      large: posix.join(orientationPath, 'large/'),
      medium: posix.join(orientationPath, 'medium/'),
      raw: posix.join(orientationPath, ''),
      'semi-large': posix.join(orientationPath, 'semi-large'),
      small: posix.join(orientationPath, 'small/'),
    };
  },

  getReelPlaylistFilePath: ({ reelId }: { reelId: string }) => {
    return `s3://${S3_BUCKETS.REEL_BUCKET}/reels/${reelId}/playlist.mp4`;
  },

  parseUrlToRelativePath: (
    url: string,
  ): {
    s3FileKey: string;
    s3Bucket: string;
  } => {
    if (!url) {
      throw Errors.FILE.INVALID_URL('URL is required');
    }

    // Sanitize URL by removing query parameters
    const sanitizedUrl = url.split('?')[0];

    const parsed = extractS3Path(sanitizedUrl);
    if (!parsed?.fullPath) {
      throw Errors.FILE.INVALID_URL(`Unable to parse URL: ${url}`);
    }

    return {
      s3Bucket: parsed.bucket || S3_BUCKETS.MAIN_VIDEO,
      s3FileKey: parsed.fullPath,
    };
  },
};

const MEDIA_BASE_URL = APP_CONFIGS.MEDIA.BASE_URL;
const URL_KEYS_TO_PREFIX = new Set<string>(
  APP_CONFIGS.MEDIA.URL_KEYS_TO_PREFIX,
);

const isAbsoluteUrl = (value: string): boolean => {
  return /^https?:\/\//iu.test(value);
};

const getFirstSourceLink = (
  orientation:
    | ThumbnailWithRatioDto['horizontal']
    | ThumbnailWithRatioDto['vertical']
    | ThumbnailWithRatioDto['square']
    | ThumbnailWithRatioDto['tv_image']
    | undefined,
): string => {
  if (!orientation) {
    return '';
  }

  const ratios = Object.values(orientation) as {
    sourceLink?: string;
  }[];
  const ratioWithSource = ratios.find((ratio) => ratio?.sourceLink);

  return ratioWithSource?.sourceLink ?? '';
};

export const buildEpisodeUrl = (
  folderPath: string,
  episodeFolder: string,
  episodeId: string,
): string => {
  return `${folderPath}/${episodeFolder}/playlist.m3u8?env=${process.env.NODE_ENV}&epId=${episodeId}`;
};

export const buildMediaAssetUrl = (key: string, value: string): string => {
  if (!value || !URL_KEYS_TO_PREFIX.has(key)) {
    return value;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/')
    ? value
    : `/${value.replace(/^\//u, '')}`;

  return `${MEDIA_BASE_URL}${normalizedPath}`;
};

export const buildSpecialAccessThumbnail = (
  thumbnail: ThumbnailWithRatioDto | null | undefined,
  contentType: ContentType = ContentType.MOVIE,
): SpecialAccessContentThumbnailDto => {
  if (!thumbnail) {
    return {};
  }

  const createUrl = (
    orientation:
      | ThumbnailWithRatioDto['horizontal']
      | ThumbnailWithRatioDto['vertical']
      | ThumbnailWithRatioDto['square']
      | undefined,
    folder: 'horizontal' | 'vertical' | 'square',
  ): string => {
    const sourceLink = getFirstSourceLink(orientation);
    if (!sourceLink) {
      return '';
    }
    if (contentType === ContentType.SHOW) {
      return `${MEDIA_BASE_URL}/show/${folder}/${sourceLink}`;
    }
    return `${MEDIA_BASE_URL}/episode/${folder}/${sourceLink}`;
  };

  const mappedThumbnail: SpecialAccessContentThumbnailDto = {};

  const horizontalUrl = createUrl(thumbnail.horizontal, 'horizontal');
  if (horizontalUrl) {
    mappedThumbnail.horizontal = horizontalUrl;
  }

  const verticalUrl = createUrl(thumbnail.vertical, 'vertical');
  if (verticalUrl) {
    mappedThumbnail.vertical = verticalUrl;
  }

  const squareUrl = createUrl(thumbnail.square, 'square');
  if (squareUrl) {
    mappedThumbnail.square = squareUrl;
  }

  return mappedThumbnail;
};
