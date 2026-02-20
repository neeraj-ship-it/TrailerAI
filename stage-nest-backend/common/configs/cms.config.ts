import { ImageOrientation } from '@app/cms/interfaces/files.interface';
import { ImageRatio, PaywallImageResolution } from 'common/enums/media.enum';

export const CMS_CONFIG = {
  IMAGE_CONFIG: {
    [ImageOrientation.HORIZONTAL]: (ratio: ImageRatio) => {
      switch (ratio) {
        case ImageRatio.RATIO_16_9:
          return {
            large: { height: 720, width: 1280 },
            medium: { height: 540, width: 960 },
            small: { height: 405, width: 720 },
          };
        case ImageRatio.RATIO_3_2:
          return {
            large: { height: 640, width: 960 },
            medium: { height: 480, width: 720 },
            small: { height: 320, width: 480 },
          };
        case ImageRatio.RATIO_7_2:
          return {
            large: { height: 1080, width: 2800 },
            medium: { height: 540, width: 2100 },
            small: { height: 405, width: 1575 },
          };
        case ImageRatio.RATIO_TV:
          return {
            large: { height: 1080, width: 1920 },
            medium: { height: 540, width: 960 },
            small: { height: 405, width: 720 },
          };
        default:
          throw new Error(`Invalid ratio for horizontal orientation: ${ratio}`);
      }
    },
    [ImageOrientation.SQUARE]: (ratio: ImageRatio) => {
      switch (ratio) {
        case ImageRatio.RATIO_1_1:
          return {
            large: { height: 800, width: 800 },
            medium: { height: 400, width: 400 },
            'semi-large': { height: 600, width: 600 }, // Only exception and required for app platter
            small: { height: 200, width: 200 },
          };
        default:
          throw new Error(`Invalid ratio for square orientation: ${ratio}`);
      }
    },
    [ImageOrientation.VERTICAL]: (ratio: ImageRatio) => {
      switch (ratio) {
        case ImageRatio.RATIO_2_3:
          return {
            large: { height: 1280, width: 800 },
            medium: { height: 960, width: 600 },
            small: { height: 240, width: 450 },
          };
        default:
          throw new Error(`Invalid ratio for vertical orientation: ${ratio}`);
      }
    },
  },

  PAYWALL_IMAGE_CONFIG: {
    [PaywallImageResolution.RATIO_21_9]: {
      height: 300,
      width: 700,
    },
  },
};
