import { Lang, Dialect } from 'common/enums/app.enum';

export type PromotionClipCopiesType = Record<
  Lang,
  {
    movie: {
      infoText: string;
      titleText: string;
      descriptionText: string;
    };
    show: {
      infoText: string;
      titleText: string;
      descriptionText: string;
    };
    generic: {
      infoText: string;
      titleText: string;
      descriptionText: string;
      playbackURL: string;
      thumbnailURL: string;
    };
    paymentSuccessPage: {
      infoText: string;
      titleText: string;
      descriptionText: string;
    };
  }
>;

export type RecommendedContentCopiesType = Record<
  Dialect,
  Record<
    Lang,
    {
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
  >
>;
