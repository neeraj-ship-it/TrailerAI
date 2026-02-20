import { APP_CONFIGS } from 'common/configs/app.config';
import { Dialect, Lang } from 'common/enums/app.enum';
import {
  PromotionClipCopiesType,
  RecommendedContentCopiesType,
} from 'common/interfaces/copies.interface';

export const SHARE_COPIES = {
  bho: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
  guj: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
  har: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
  raj: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
};
export const MICRODRAMA_CATEGORY_FILTER_COPIES = {
  en: {
    top10: 'Top 10 Microdramas',
    trending: 'Trending Microdramas',
  },
  hin: {
    top10: 'टॉप 10 माइक्रोड्रामा',
    trending: 'ट्रेंडिंग माइक्रोड्रामा',
  },
};
export const SHARE_COPIES_PREVIEW = {
  en: 'This content is exclusive to you, do not share it with others',
  hin: 'यह फिल्म/शो सिर्फ आपके लिए है, कृपया इसे किसी और के साथ शेयर न करें।',
};

export const PROMOTION_CLIP_COPIES: PromotionClipCopiesType = {
  [Lang.EN]: {
    generic: {
      descriptionText: '',
      infoText: 'Now start watching',
      playbackURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      thumbnailURL: `${APP_CONFIGS.CDN.URL}/icons/success1x_icon_18oct.png`, // TODO: Replace this after getting the thumbnail from the product team
      titleText: 'Your favourite movie/show is ready',
    },
    movie: {
      descriptionText: 'Movie · %contentDuration%',
      infoText: 'Your favourite movie is ready',
      titleText: 'Now start watching',
    },
    paymentSuccessPage: {
      descriptionText: '',
      infoText: 'Now start watching',
      titleText: 'Your favourite movie/show is ready',
    },
    show: {
      descriptionText: 'Show · %contentDuration%',
      infoText: 'Your favourite movie is ready',
      titleText: 'Now start watching',
    },
  },
  [Lang.HIN]: {
    generic: {
      descriptionText: '',
      infoText: 'अब देखना शुरू करें',
      playbackURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      thumbnailURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      titleText: 'आपकी पसंदीदा फिल्म/शो तैयार है',
    },
    movie: {
      descriptionText: 'फिल्म · %contentDuration%',
      infoText: 'अब देखना शुरू करें',
      titleText: 'आपकी पसंदीदा फिल्म तैयार है',
    },
    paymentSuccessPage: {
      descriptionText: '',
      infoText: 'अब देखना शुरू करें',
      titleText: 'आपकी पसंदीदा फिल्म/शो तैयार है',
    },
    show: {
      descriptionText: 'शो · %contentDuration%',
      infoText: 'अब देखना शुरू करें',
      titleText: 'आपका पसंदीदा शो तैयार है',
    },
  },
};

export const RECOMMENDED_CONTENT_COPIES: RecommendedContentCopiesType = {
  [Dialect.BHO]: {
    [Lang.EN]: {
      top1: {
        descriptionText: 'Movie · 1h 20mins',
        titleText: 'Bhojpuri top movie is ready',
      },
      top2: {
        descriptionText: 'Based on what viewers like to watch',
        motivatorText: [
          'Liked by 1.1 lakh+ viewers',
          'Liked by 2.1 lakh+ viewers',
        ],
        titleText: 'Bhojpuri top movies are ready',
      },
    },
    [Lang.HIN]: {
      top1: {
        descriptionText: 'मूवी · 1 घंटा 20 मिनट',
        titleText: 'भोजपुरी की टॉप मूवी/शो तैयार है',
      },
      top2: {
        descriptionText: 'दर्शकों की पसंद के आधार पर',
        motivatorText: [
          '1.1 लाख+ लोगों ने पसंद किया',
          '2.1 लाख+ लोगों ने पसंद किया',
        ],
        titleText: 'भोजपुरी की टॉप मूवीज़/शोज़ तैयार हैं',
      },
    },
  },
  [Dialect.GUJ]: {
    [Lang.EN]: {
      top1: {
        descriptionText: 'Movie · 1h 20mins',
        titleText: 'Gujarati top movie is ready',
      },
      top2: {
        descriptionText: 'Based on what viewers like to watch',
        motivatorText: [
          'Liked by 1.1 lakh+ viewers',
          'Liked by 2.1 lakh+ viewers',
        ],
        titleText: 'Gujarati top movies are ready',
      },
    },
    [Lang.HIN]: {
      top1: {
        descriptionText: 'मूवी · 1 घंटा 20 मिनट',
        titleText: 'गुजराती की टॉप मूवी/शो तैयार है',
      },
      top2: {
        descriptionText: 'दर्शकों की पसंद के आधार पर',
        motivatorText: [
          '1.1 लाख+ लोगों ने पसंद किया',
          '2.1 लाख+ लोगों ने पसंद किया',
        ],
        titleText: 'गुजराती की टॉप मूवीज़/शोज़ तैयार हैं',
      },
    },
  },
  [Dialect.HAR]: {
    [Lang.EN]: {
      top1: {
        descriptionText: 'Movie · 1h 20mins',
        titleText: 'Haryanvi top movie is ready',
      },
      top2: {
        descriptionText: 'Based on what viewers like to watch',
        motivatorText: [
          'Liked by 1.1 lakh+ viewers',
          'Liked by 2.1 lakh+ viewers',
        ],
        titleText: 'Haryanvi top movies are ready',
      },
    },
    [Lang.HIN]: {
      top1: {
        descriptionText: 'मूवी · 1 घंटा 20 मिनट',
        titleText: 'हरियाणवी की टॉप मूवी/शो तैयार है',
      },
      top2: {
        descriptionText: 'दर्शकों की पसंद के आधार पर',
        motivatorText: [
          '1.1 लाख+ लोगों ने पसंद किया',
          '2.1 लाख+ लोगों ने पसंद किया',
        ],
        titleText: 'हरियाणवी की टॉप मूवीज़/शोज़ तैयार हैं',
      },
    },
  },
  [Dialect.RAJ]: {
    [Lang.EN]: {
      top1: {
        descriptionText: 'Movie · 1h 20mins',
        titleText: 'Rajasthani top movie is ready',
      },
      top2: {
        descriptionText: 'Based on what viewers like to watch',
        motivatorText: [
          'Liked by 1.1 lakh+ viewers',
          'Liked by 2.1 lakh+ viewers',
        ],
        titleText: 'Rajasthani top movies are ready',
      },
    },
    [Lang.HIN]: {
      top1: {
        descriptionText: 'मूवी · 1 घंटा 20 मिनट',
        titleText: 'राजस्थानी की टॉप मूवी/शो तैयार है',
      },
      top2: {
        descriptionText: 'दर्शकों की पसंद के आधार पर',
        motivatorText: [
          '1.1 लाख+ लोगों ने पसंद किया',
          '2.1 लाख+ लोगों ने पसंद किया',
        ],
        titleText: 'राजस्थानी की टॉप मूवीज़/शोज़ तैयार हैं',
      },
    },
  },
};
