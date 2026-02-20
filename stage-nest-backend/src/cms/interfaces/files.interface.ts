import { ContentType } from 'common/enums/common.enums';
import { ImageRatio } from 'common/enums/media.enum';
import {
  VisionularContentType,
  VisionularTranscodingTemplate,
} from 'common/interfaces/visionular.interface';
export interface GoogleDriveFile {
  createdTime: string | null;
  fileExtension: string | null;
  iconLink: string | null;
  id: string | null;
  isFolder: boolean;
  mimeType: string | null;
  modifiedTime: string | null;
  name: string | null;
  owners: string[];
  size: number | null;
  thumbnailLink: string | null;
  videoMediaMetadata: {
    width: number | null;
    height: number | null;
    durationMillis: number | null;
  };
  webViewLink: string | null;
}

// Define specific parameter types based on contentType
interface BaseTranscodingParams {
  sourceLink: string;
  transcodingTemplate: VisionularTranscodingTemplate;
}

interface ShowEpisodeParams extends BaseTranscodingParams {
  contentType: VisionularContentType.SHOW_EPISODE;
  episodeSlug: string;
  showSlug: string;
}

interface IndividualParams extends BaseTranscodingParams {
  contentType: VisionularContentType.INDIVIDUAL;
  episodeSlug: string;
}

interface ShowPeripheralParams extends BaseTranscodingParams {
  contentType: VisionularContentType.SHOW_PERIPHERAL;
  showSlug: string;
}

interface EpisodePeripheralParams extends BaseTranscodingParams {
  contentType: VisionularContentType.EPISODE_PERIPHERAL;
  episodeSlug: string;
}

interface ReelParams extends BaseTranscodingParams {
  contentSlug: string;
  contentType: VisionularContentType.REEL;
  reelContentType: ContentType.SHOW | ContentType.MOVIE;
  reelId: string;
}

interface EpisodeTeaserParams extends BaseTranscodingParams {
  contentType: VisionularContentType.EPISODE_TEASER;
  episodeSlug: string;
  showSlug: string;
}

export type GenerateContentTranscodingParams =
  | ShowEpisodeParams
  | IndividualParams
  | ShowPeripheralParams
  | EpisodePeripheralParams
  | ReelParams
  | EpisodeTeaserParams;
/**
 * Defines the structure for image dimensions.
 * Height can be null if not specified (e.g., show.vertical).
 */
export interface ImageDimensions {
  height: number;
  width: number;
}

/**
 * Defines the standard size variants required for each ratio.
 */
interface SizeVariants {
  large: ImageDimensions;
  medium: ImageDimensions;
  small: ImageDimensions;
}

/**
 * Defines formats specifically for square images.
 */
export interface SquareFormats {
  /** Aspect Ratio 1:1 */
  [ImageRatio.RATIO_1_1]: SizeVariants;
}

/**
 * Defines formats specifically for horizontal images.
 */
export interface HorizontalFormats {
  /** Aspect Ratio 16:9 */
  [ImageRatio.RATIO_16_9]: SizeVariants;
  /** Aspect Ratio 3:2 */
  [ImageRatio.RATIO_3_2]: SizeVariants;
  /** Aspect Ratio ~7:2 */
  [ImageRatio.RATIO_7_2]: SizeVariants;
}

/**
 * Defines formats specifically for vertical images.
 */
export interface VerticalFormats {
  /** Aspect Ratio 4:5 */
  [ImageRatio.RATIO_2_3]: SizeVariants;
}
/**
 * Top-level interface for the typed image format configuration.
 * Includes only orientations and ratios that contain definitions
 * for small, medium, AND large sizes.
 */
export interface ImageFormatConfig {
  // Horizontal orientation is optional only if its ratios might not always have s/m/l
  [ImageOrientation.HORIZONTAL]: HorizontalFormats;
  // Square orientation is optional only if ratio_1_1 might not always have s/m/l
  [ImageOrientation.SQUARE]: SquareFormats;
  // Vertical orientation is optional only if its ratios might not always have s/m/l
  [ImageOrientation.VERTICAL]: VerticalFormats;
  // Rectangle orientation is excluded as it didn't have small, medium, and large sizes.
}

export enum ImageOrientation {
  HORIZONTAL = 'horizontal',
  SQUARE = 'square',
  VERTICAL = 'vertical',
}

export enum ImageSize {
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small',
}

export type MP4Resolution = 240 | 360 | 480 | 720 | 1080;

export type FrameExtractedCallback = (
  frameData: Buffer,
  timestampSeconds: number,
) => Promise<void> | void;

export interface FrameExtractionResult {
  error?: string;
  framesExtracted: number;
  success: boolean;
}
