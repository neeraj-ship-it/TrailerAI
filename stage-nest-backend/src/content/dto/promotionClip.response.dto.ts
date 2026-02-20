import { Dialect, Lang, Platform } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';

export interface RecommendedContentCopiesTypeDto {
  top1: {
    titleText: string;
    descriptionText: string;
  };
  top2: {
    titleText: string;
    descriptionText: string;
    motivatorText: string[];
  };
}
export interface PromotionClipResponseDto {
  descriptionText?: string;
  infoText: string;
  playbackURL: string;
  recommended_content: PaymentSuccessPageRecommendedContentDto[];
  recommended_content_copies: RecommendedContentCopiesTypeDto;
  thumbnailURL: string;
  titleText: string;
}

export interface PaymentSuccessPageRecommendedContentParams {
  dialect: Dialect;
  lang: Lang;
  platform: Platform;
}

export interface PaymentSuccessPageRecommendedContentDto {
  contentId: number;
  contentType: ContentType;
  horizontalThumbnail: string;
  title: string;
  trailerUrl: string | null;
  verticalThumbnail: string;
}
