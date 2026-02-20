import { Document } from 'mongoose';

import {
  UserCultures,
  UserCultureStatusEnum,
} from '@app/common/entities/userCultures.entity';

export const userCultureData: Omit<
  UserCultures,
  Exclude<keyof Document, '_id'>
>[] = [
  {
    _id: 1,
    abbreviation: 'har',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/haryanvi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Haryanvi',
        },
        selectionScreen: {
          title: 'I am Haryanvi',
        },
        updateScreen: {
          title: 'I am Haryanvi',
        },
      },
      title: 'Haryanvi',
    },
    hin: {
      imageUrl: '/static/haryanvi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं हरियाणवी हूँ',
        },
        selectionScreen: {
          title: 'मैं हरियाणवी हूँ',
        },
        updateScreen: {
          title: 'मैं हरियाणवी हूँ',
        },
      },
      title: 'हरियाणवी',
    },
    isEnabled: true,
    name: 'Haryanvi',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 3,
    abbreviation: 'bho',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/bhojpuri_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Bhojpuri',
        },
        selectionScreen: {
          title: 'I am Bhojpuri',
        },
        updateScreen: {
          title: 'I am Bhojpuri',
        },
      },
      title: 'Bhojpuri',
    },
    hin: {
      imageUrl: '/static/bhojpuri_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं भोजपुरी हूँ',
        },
        selectionScreen: {
          title: 'मैं भोजपुरी हूँ',
        },
        updateScreen: {
          title: 'मैं भोजपुरी हूँ',
        },
      },
      title: 'भोजपुरी',
    },
    isEnabled: true,
    name: 'Bhojpuri',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 2,
    abbreviation: 'raj',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Rajasthani',
        },
        selectionScreen: {
          title: 'I am Rajasthani',
        },
        updateScreen: {
          title: 'I am Rajasthani',
        },
      },
      title: 'Rajasthani',
    },
    hin: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं राजस्थानी हूँ',
        },
        selectionScreen: {
          title: 'मैं राजस्थानी हूँ',
        },
        updateScreen: {
          title: 'मैं राजस्थानी हूँ',
        },
      },
      title: 'राजस्थानी',
    },
    isEnabled: true,
    name: 'Rajasthani',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 4,
    abbreviation: 'ben',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Bengali',
        },
        selectionScreen: {
          title: 'I am Bengali',
        },
        updateScreen: {
          title: 'I am Bengali',
        },
      },
      title: 'Bengali',
    },
    hin: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं बंगाली हूँ',
        },
        selectionScreen: {
          title: 'मैं बंगाली हूँ',
        },
        updateScreen: {
          title: 'मैं बंगाली हूँ',
        },
      },
      title: 'बंगाली',
    },
    isEnabled: false,
    name: 'Bengali',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 5,
    abbreviation: 'guj',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Gujrati',
        },
        selectionScreen: {
          title: 'I am Gujrati',
        },
        updateScreen: {
          title: 'I am Gujrati',
        },
      },
      title: 'Gujrati',
    },
    hin: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं गुजराती हूँ',
        },
        selectionScreen: {
          title: 'मैं गुजराती हूँ',
        },
        updateScreen: {
          title: 'मैं गुजराती हूँ',
        },
      },
      title: 'गुजराती',
    },
    isEnabled: false,
    name: 'Gujrati',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 6,
    abbreviation: 'mar',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Marathi',
        },
        selectionScreen: {
          title: 'I am Marathi',
        },
        updateScreen: {
          title: 'I am marathi',
        },
      },
      title: 'Marathi',
    },
    hin: {
      imageUrl: '/static/rajasthan_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं मराठी हूँ',
        },
        selectionScreen: {
          title: 'मैं मराठी हूँ',
        },
        updateScreen: {
          title: 'मैं मराठी हूँ',
        },
      },
      title: 'मराठी',
    },
    isEnabled: false,
    name: 'Marathi',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 7,
    abbreviation: 'asm',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/assamese_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Assamese',
        },
        selectionScreen: {
          title: 'I am Assamese',
        },
        updateScreen: {
          title: 'I am Assamese',
        },
      },
      title: 'Assamese',
    },
    hin: {
      imageUrl: '/static/assamese_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं असमिया हूँ',
        },
        selectionScreen: {
          title: 'मैं असमिया हूँ',
        },
        updateScreen: {
          title: 'मैं असमिया हूँ',
        },
      },
      title: 'असमिया',
    },
    isEnabled: false,
    name: 'Assamese',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 8,
    abbreviation: 'awa',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/awadhi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Awadhi',
        },
        selectionScreen: {
          title: 'I am Awadhi',
        },
        updateScreen: {
          title: 'I am Awadhi',
        },
      },
      title: 'Awadhi',
    },
    hin: {
      imageUrl: '/static/awadhi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं अवधी हूँ',
        },
        selectionScreen: {
          title: 'मैं अवधी हूँ',
        },
        updateScreen: {
          title: 'मैं अवधी हूँ',
        },
      },
      title: 'अवधी',
    },
    isEnabled: false,
    name: 'Awadhi',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 9,
    abbreviation: 'bdl',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/bhadlai_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Bhadlai',
        },
        selectionScreen: {
          title: 'I am Bhadlai',
        },
        updateScreen: {
          title: 'I am Bhadlai',
        },
      },
      title: 'Bhadlai',
    },
    hin: {
      imageUrl: '/static/bhadlai_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं भदलाई हूँ',
        },
        selectionScreen: {
          title: 'मैं भदलाई हूँ',
        },
        updateScreen: {
          title: 'मैं भदलाई हूँ',
        },
      },
      title: 'भदलाई',
    },
    isEnabled: false,
    name: 'Bhadlai',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 10,
    abbreviation: 'bra',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/braj_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Braj',
        },
        selectionScreen: {
          title: 'I am Braj',
        },
        updateScreen: {
          title: 'I am Braj',
        },
      },
      title: 'Braj',
    },
    hin: {
      imageUrl: '/static/braj_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं ब्रज हूँ',
        },
        selectionScreen: {
          title: 'मैं ब्रज हूँ',
        },
        updateScreen: {
          title: 'मैं ब्रज हूँ',
        },
      },
      title: 'ब्रज',
    },
    isEnabled: false,
    name: 'Braj',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 11,
    abbreviation: 'bun',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/bundelkhandi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Bundelkhandi',
        },
        selectionScreen: {
          title: 'I am Bundelkhandi',
        },
        updateScreen: {
          title: 'I am Bundelkhandi',
        },
      },
      title: 'Bundelkhandi',
    },
    hin: {
      imageUrl: '/static/bundelkhandi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं बुंदेलखंडी हूँ',
        },
        selectionScreen: {
          title: 'मैं बुंदेलखंडी हूँ',
        },
        updateScreen: {
          title: 'मैं बुंदेलखंडी हूँ',
        },
      },
      title: 'बुंदेलखंडी',
    },
    isEnabled: false,
    name: 'Bundelkhandi',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 12,
    abbreviation: 'chg',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/chhattisgarhi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Chhattisgarhi',
        },
        selectionScreen: {
          title: 'I am Chhattisgarhi',
        },
        updateScreen: {
          title: 'I am Chhattisgarhi',
        },
      },
      title: 'Chhattisgarhi',
    },
    hin: {
      imageUrl: '/static/chhattisgarhi_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं छत्तीसगढ़ी हूँ',
        },
        selectionScreen: {
          title: 'मैं छत्तीसगढ़ी हूँ',
        },
        updateScreen: {
          title: 'मैं छत्तीसगढ़ी हूँ',
        },
      },
      title: 'छत्तीसगढ़ी',
    },
    isEnabled: false,
    name: 'Chhattisgarhi',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
  {
    _id: 13,
    abbreviation: 'doi',
    createdAt: new Date('2025-01-23T09:41:51.718Z'),
    en: {
      imageUrl: '/static/dogri_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'I am Dogri',
        },
        selectionScreen: {
          title: 'I am Dogri',
        },
        updateScreen: {
          title: 'I am Dogri',
        },
      },
      title: 'Dogri',
    },
    hin: {
      imageUrl: '/static/dogri_user_culture.png',
      screens: {
        confirmationScreen: {
          title: 'मैं डोगरी हूँ',
        },
        selectionScreen: {
          title: 'मैं डोगरी हूँ',
        },
        updateScreen: {
          title: 'मैं डोगरी हूँ',
        },
      },
      title: 'डोगरी',
    },
    isEnabled: false,
    name: 'Dogri',
    status: UserCultureStatusEnum.ACTIVE,
    updatedAt: new Date('2025-01-23T09:41:51.718Z'),
  },
];
