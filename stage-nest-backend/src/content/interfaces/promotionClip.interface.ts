import { Dialect, Lang, Platform } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';

export type PromotionClipContentType = ContentType.MOVIE | ContentType.SHOW;

export interface PromotionClipDto {
  descriptionText: string;
  duration: number;
  infoText: string;
  playbackURL: string;
  slug: string;
  thumbnailURL: string;
  titleText: string;
}

export interface PromotionClipParams {
  contentId?: number;
  contentType?: PromotionClipContentType;
  dialect: Dialect;
  lang: Lang;
  planId?: string;
  platform: Platform;
}

export interface PromotionClipContext {
  contentMetadata: ContentSpecificPromotionClip;
  lang: Lang;
  platform: Platform;
}

export interface ContentSpecificPromotionClip {
  contentId: number;
  contentType: PromotionClipContentType;
  lang: Lang;
  platform: Platform;
}

export interface FallbackPromotionClip {
  descriptionText: string;
  infoText: string;
  playbackURL: string;
  thumbnailUrl: string;
  title: string;
}

export interface PromotionClip {
  contentMetadata: ContentSpecificPromotionClip;
  lang: Lang;
  platform: Platform;
}
