import { Dialect, Lang } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';

export const CONTENT_CONSTANTS = {
  CATEGORY_WEIGHT: 0.5,
  DESCRIPTOR_TAG_WEIGHT: 0.5,
  MOOD_WEIGHT: 0.5,
  THEME_WEIGHT: 0.5,
};

export const TV_APP_BUILD_CONSTANTS = {
  TV_EPISODIC_RELEASE_MIN_BUILD_NUMBER: 505810,
};
export const DATE_OVERLAY_CONSTANTS = {
  AVAILABLE_TEXT: {
    [Lang.EN]: 'Available',
    [Lang.HIN]: 'उपलब्ध',
  },
  LOCALE_MAP: {
    [Lang.EN]: 'en-IN',
    [Lang.HIN]: 'hi-IN',
  },
};

// Label text constants for overlay tags
export const LABEL_TEXT = {
  en: '🔥 New Episode',
  hin: '🔥 नया एपिसोड',
};

export const CONTENT_FORMAT_ENUMS = {
  MICRO_DRAMA: 'microdrama',
  STANDARD: 'standard',
};

export const PROFILE_SELECTION_CONTENT_DATA = {
  CONTENT: [
    {
      slug: 'akhada-phir-se-hr',
      type: 'show',
    },
    {
      slug: '12vi-aala-pyar-rj',
      type: 'show',
    },
    {
      slug: 'mokhan-vahini',
      type: 'individual',
    },
    {
      slug: 'paali-ka-pilla',
      type: 'show',
    },
    {
      slug: 'bbb',
      type: 'show',
    },
    {
      slug: 'bajri-mafia-movie',
      type: 'show',
    },
    {
      slug: 'bhagyawan',
      type: 'individual',
    },
    {
      slug: '-bajri-mafia-hr',
      type: 'show',
    },
    {
      slug: 'dj-marwar_',
      type: 'individual',
    },
    {
      slug: 'mokhan-vahini',
      type: 'individual',
    },
    {
      slug: 'daam-hr',
      type: 'show',
    },
    {
      slug: 'bhawani',
      type: 'show',
    },
    {
      slug: 'dada-lakhmi',
      type: 'show',
    },
    {
      slug: 'dc-rate_hr',
      type: 'individual',
    },
    {
      slug: 'prem-kabooter-bh',
      type: 'individual',
    },
    {
      slug: 'desi-',
      type: 'individual',
    },
    {
      slug: 'group---d-season-2',
      type: 'show',
    },
    {
      slug: 'kaand-2010_',
      type: 'show',
    },
    {
      slug: 'punarjanam',
      type: 'show',
    },
    {
      slug: 'safe-house---2-',
      type: 'show',
    },
    {
      slug: 'dj-marwar_',
      type: 'individual',
    },
    {
      slug: 'rang-de-basanti-bh',
      type: 'individual',
    },
    {
      slug: 'safe-house',
      type: 'show',
    },
    {
      slug: 'maayro',
      type: 'show',
    },
    {
      slug: 'vidshi-bahu',
      type: 'show',
    },
    {
      slug: 'tu-sita-hum-ram-',
      type: 'individual',
    },
    {
      slug: 'bajri-mafia-movie',
      type: 'show',
    },
    {
      slug: 'bhawani',
      type: 'show',
    },

    {
      slug: 'muklawa',
      type: 'show',
    },
    {
      slug: 'nuchwana',
      type: 'show',
    },
    {
      slug: 'punarjanam-rj',
      type: 'show',
    },
    {
      slug: 'rees',
      type: 'show',
    },
    {
      slug: '12vi-aala-pyar',
      type: 'individual',
    },
    {
      slug: 'bad-boys-bhiwani-bh',
      type: 'show',
    },

    {
      slug: 'punarjanam-janam-ke-phera-bho',
      type: 'individual',
    },

    {
      slug: 'saas-gari-deve-bh',
      type: 'individual',
    },
    {
      slug: 'samaaj-mein-parivartan-bh',
      type: 'individual',
    },
  ],
};

export const PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT = {
  [Dialect.BHO]: {
    [Lang.EN]: [
      {
        content_id: 10445,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 9759,
        content_type: ContentType.MOVIE,
      },
    ],
    [Lang.HIN]: [
      {
        content_id: 10444,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 9758,
        content_type: ContentType.MOVIE,
      },
    ],
  },
  [Dialect.GUJ]: {
    [Lang.EN]: [
      {
        content_id: 10445,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 9759,
        content_type: ContentType.MOVIE,
      },
    ],
    [Lang.HIN]: [
      {
        content_id: 10444,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 9758,
        content_type: ContentType.MOVIE,
      },
    ],
  },
  [Dialect.HAR]: {
    [Lang.EN]: [
      {
        content_id: 9765,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 15972,
        content_type: ContentType.SHOW,
      },
    ],
    [Lang.HIN]: [
      {
        content_id: 9764,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 15973,
        content_type: ContentType.SHOW,
      },
    ],
  },
  [Dialect.RAJ]: {
    [Lang.EN]: [
      {
        content_id: 8295,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 4680,
        content_type: ContentType.MOVIE,
      },
    ],
    [Lang.HIN]: [
      {
        content_id: 8294,
        content_type: ContentType.MOVIE,
      },
      {
        content_id: 4681,
        content_type: ContentType.MOVIE,
      },
    ],
  },
};
