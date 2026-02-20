import {
  OnboardingContentType,
  OnboardingStatus,
} from '../entities/contentCategoryOnboardingMapping.entity';

export const contentCategoryOnboardingMappingSeedData = [
  // Mewat - Adding to Social Reality category as general content
  {
    _id: 1,
    categoryIds: [7], // समाज की हकीकत (Social Reality)
    cityAttributed: ['Mewat'],
    contentSlug: 'mewat',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // College kaand - Zabardast Motivation (category 3)
  {
    _id: 2,
    categoryIds: [3], // ज़बरदस्त मॉटीवेशन
    cityAttributed: ['Delhi'],
    contentSlug: 'college-kaand',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Group D - Zabardast Motivation (category 3)
  {
    _id: 3,
    categoryIds: [3], // ज़बरदस्त मॉटीवेशन
    cityAttributed: ['Mumbai'],
    contentSlug: 'group-d',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 2,
    status: OnboardingStatus.ACTIVE,
  },

  // Akhada - Khaufnaak Badla + Zabardast Motivation (categories 4, 3)
  {
    _id: 4,
    categoryIds: [4, 3], // खौफनाक बदला + ज़बरदस्त मॉटीवेशन
    cityAttributed: ['Varanasi'],
    contentSlug: 'akhada',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Kaand 2010 - Khaufnaak Badla (category 4)
  {
    _id: 5,
    categoryIds: [4], // खौफनाक बदला
    cityAttributed: ['Lucknow'],
    contentSlug: 'kaand-2010',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 2,
    status: OnboardingStatus.ACTIVE,
  },

  // Opri paraai - Aatma Ka Badla + Ghar-Ghar Ke Masle (categories 2, 5)
  {
    _id: 6,
    categoryIds: [2, 5], // आत्मा का बदला + घर-घर के मसले
    cityAttributed: ['Kolkata'],
    contentSlug: 'opri-paraai',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Punarjanam - Aatma Ka Badla + Ghar-Ghar Ke Masle (categories 2, 5)
  {
    _id: 7,
    categoryIds: [2, 5], // आत्मा का बदला + घर-घर के मसले
    cityAttributed: ['Jaipur'],
    contentSlug: 'punarjanam',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 2,
    status: OnboardingStatus.ACTIVE,
  },

  // Baarvi aala pyaar - Aashiqui Mein Dhokha (category 1)
  {
    _id: 8,
    categoryIds: [1], // आशिकी में धोखा
    cityAttributed: ['Pune'],
    contentSlug: 'baarvi-aala-pyaar',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Dada lakhmi - Zabardast Motivation (category 3)
  {
    _id: 9,
    categoryIds: [3], // ज़बरदस्त मॉटीवेशन
    cityAttributed: ['Ahmedabad'],
    contentSlug: 'dada-lakhmi',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 3,
    status: OnboardingStatus.ACTIVE,
  },

  // Doojvaar - Ghar-Ghar Ke Masle + Zabardast Motivation (categories 5, 3)
  {
    _id: 10,
    categoryIds: [5, 3], // घर-घर के मसले + ज़बरदस्त मॉटीवेशन
    cityAttributed: ['Chennai'],
    contentSlug: 'doojvaar',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Sanki aashiq - Aashiqui Mein Dhokha + Khaufnaak Badla (categories 1, 4)
  {
    _id: 11,
    categoryIds: [1, 4], // आशिकी में धोखा + खौफनाक बदला
    contentSlug: 'sanki-aashiq',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Bewafa darling - Aashiqui Mein Dhokha + Ghar-Ghar Ke Masle + Khaufnaak Badla (categories 1, 5, 4)
  {
    _id: 12,
    categoryIds: [1, 5, 4], // आशिकी में धोखा + घर-घर के मसले + खौफनाक बदला
    contentSlug: 'bewafa-darling',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 1,
    status: OnboardingStatus.ACTIVE,
  },

  // Teesri chhori - Ghar-Ghar Ke Masle + Zabardast Motivation (categories 5, 3)
  {
    _id: 13,
    categoryIds: [5, 3], // घर-घर के मसले + ज़बरदस्त मॉटीवेशन
    contentSlug: 'teesri-chhori',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 2,
    status: OnboardingStatus.ACTIVE,
  },

  // DC rate - Zabardast Motivation (category 3)
  {
    _id: 14,
    categoryIds: [3], // ज़बरदस्त मॉटीवेशन
    contentSlug: 'dc-rate',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 4,
    status: OnboardingStatus.ACTIVE,
  },

  // Muhnochani - Aatma Ka Badla (category 2)
  {
    _id: 15,
    categoryIds: [2], // आत्मा का बदला
    contentSlug: 'muhnochani',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 3,
    status: OnboardingStatus.ACTIVE,
  },

  // Opri Hawa - Aatma Ka Badla + Ghar-Ghar Ke Masle (categories 2, 5)
  {
    _id: 16,
    categoryIds: [2, 5], // आत्मा का बदला + घर-घर के मसले
    contentSlug: 'opri-hawa',
    contentType: OnboardingContentType.SHOW,
    priorityOrder: 3,
    status: OnboardingStatus.ACTIVE,
  },
];
