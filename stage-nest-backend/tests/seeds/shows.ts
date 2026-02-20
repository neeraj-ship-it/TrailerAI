import { Document } from 'mongoose';

import { ContentFormat } from '@app/common/entities/contents.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { Show } from 'src/content/entities/show.entity';

export const showData: Omit<Show, Exclude<keyof Document, '_id'>>[] = [
  {
    _id: 7,
    artistList: [
      {
        callingName: 'Ramnath Shastri',
        city: 'Haryana',
        display: '',
        firstName: 'Ramnath',
        gender: '',
        gradient: '',
        id: 1,
        lastName: 'Shastri',
        name: 'Ramnath Shastri',
        order: 1,
        profilePic: '',
        slug: 'ramnath-shastri',
        status: 'active',
      },
    ],
    categoryList: [],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date(),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description:
      'हरियाणा में साक्षरता दर काम होने की वजह से लोग अक्सर लड़कियों को लड़कों से कम समझते हैं, और इस वजह से भ्रूण हत्या, दहेज़, कम उम्र में लड़कियों की शादी कर देना जैसे अपराध कर देते हैं। इस शो के जरिये हम उन सब लोगों तक पहुँचने की कोशिश करेंगे और उन्हें ये बताने की कोशिश करेंगे की लड़कियां समाज का बहुत महत्त्वपूर्ण हिस्सा हैं और वो किसी से कम नहीं होती हैं।',
    displayLanguage: Lang.HIN,
    duration: 1743,
    endDate: new Date('2020-07-17T07:37:03.693Z'),
    englishValidated: true,
    episodeCount: 5,
    format: ContentFormat.STANDARD,
    genreList: [
      { id: 1, name: 'Action' },
      { id: 2, name: 'Comedy' },
      { id: 3, name: 'Drama' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 2,
    isNewContent: false,
    isPopularContent: false,
    isPremium: true,
    isScheduled: false,
    keywordSearch: '',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    metaDescription:
      'हरियाणा में साक्षरता दर काम होने की वजह से लोग अक्सर लड़कियों को लड़कों से कम समझते हैं, और इस वजह से भ्रूण हत्या, दहेज़, कम उम्र में लड़कियों की शादी कर देना जैसे अपराध कर देते हैं। इस शो के जरिये हम उन सब लोगों तक पहुँचने की कोशिश करेंगे और उन्हें ये बताने की कोशिश करेंगे की लड़कियां समाज का बहुत महत्त्वपूर्ण हिस्सा हैं और वो किसी से कम नहीं होती हैं।',
    metaKeyword: 'छोरियाँ बोझ ना होती',
    metaTitle: 'छोरियाँ बोझ ना होती',
    mlTags:
      'feminism, social issues, haryana ki beti, betiya, poems, inspiring, motivation, sattire, domestic, social rights, empowerment, education, dark truth',
    order: 2,
    peripheralCount: 1,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 4,
    randomOrder: 118,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2019-10-23',
    seasonCount: 1,
    slug: 'choriyaan-bojh-na-hoti',
    startDate: new Date('2019-10-23T00:00:00.000Z'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 24,
        name: 'karuna-ras',
      },
      {
        id: 26,
        name: 'roudra-ras',
      },
      {
        id: 25,
        name: 'adbhut-ras',
      },
    ],
    tags: 'Choriyan Bojh Na Hoti,Ramnath Shastri,Dayal Chand',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'showImage-1588584258059.jpg',
        },
        ratio2: {
          gradient: '#93552e',
          sourceLink: 'showImage-1594971377633.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'showImage-1594971377633.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'choriyaan-bojh-na-hoti_har_hin_2_3.jpg',
        },
      },
    },
    title: 'छोरियाँ बोझ ना होती',
    updatedAt: new Date('2024-08-02T01:59:57.194Z'),
    viewCount: 0,
  },
  {
    _id: 70,
    artistList: [
      {
        callingName: 'Shyam Shastri',
        city: 'Haryana',
        display: '',
        firstName: 'Shyam',
        gender: '',
        gradient: '',
        id: 2,
        lastName: 'Shastri',
        name: 'Shyam Shastri',
        order: 1,
        profilePic: '',
        slug: 'shyam-shastri',
        status: 'active',
      },
    ],
    categoryList: [],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date(),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description: 'Test description',
    displayLanguage: Lang.EN,
    duration: 174,
    endDate: new Date('2020-07-17T07:37:03.693Z'),
    englishValidated: true,
    episodeCount: 5,
    format: ContentFormat.STANDARD,
    genreList: [
      { id: 1, name: 'Action' },
      { id: 2, name: 'Comedy' },
      { id: 3, name: 'Drama' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 2,
    isNewContent: false,
    isPopularContent: false,
    isPremium: true,
    isScheduled: false,
    keywordSearch: '',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    metaDescription: 'Meta description',
    metaKeyword: 'Meta keyword',
    metaTitle: 'Meta title',
    mlTags:
      'feminism, social issues, haryana ki beti, betiya, poems, inspiring, motivation, sattire, domestic, social rights, empowerment, education, dark truth',
    order: 2,
    peripheralCount: 1,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 4,
    randomOrder: 118,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2019-10-23',
    seasonCount: 1,
    slug: 'shyam-bojh-',
    startDate: new Date('2019-10-23T00:00:00.000Z'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 24,
        name: 'karuna-ras',
      },
      {
        id: 26,
        name: 'roudra-ras',
      },
      {
        id: 25,
        name: 'adbhut-ras',
      },
    ],
    tags: 'Choriyan Bojh Na Hoti,Ramnath Shastri,Dayal Chand',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'showImage-1588584258059.jpg',
        },
        ratio2: {
          gradient: '#93552e',
          sourceLink: 'showImage-1594971377633.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'showImage-1594971377633.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#93552e',
          sourceLink: 'bojh-na-hoti_har_hin_2_3.jpg',
        },
      },
    },
    title: 'Bojh Na Hoti',
    updatedAt: new Date('2024-08-02T01:59:57.194Z'),
    viewCount: 0,
  },
  {
    _id: 309,
    allThumbnails: [
      {
        horizontal: {
          ratio1: {
            gradient: '#f3d36d',
            sourceLink: 'showImage-1644651730319.jpg',
          },
          ratio2: {
            gradient: '#f3d36d',
            sourceLink: 'showImage-1644651758278.jpg',
          },
          ratio3: {
            gradient: '',
            sourceLink: '',
          },
          ratio4: {
            gradient: '#f3d36d',
            sourceLink: 'prem-nagar_har_eng_7_2.jpg',
          },
        },
        id: 1,
        square: {
          ratio1: {
            gradient: '#f3d36d',
            sourceLink: 'showImage-1644651758278.jpg',
          },
        },
        vertical: {
          ratio1: {
            gradient: '#f3d36d',
            sourceLink: 'prem-nagar_Har_Eng2x3.jpg',
          },
        },
      },
      {
        horizontal: {
          ratio1: {
            gradient: '#e4af60',
            sourceLink: 'showImage-1647728813573.jpg',
          },
          ratio2: {
            gradient: '#f4bd58',
            sourceLink: 'showImage-1647728834989.jpg',
          },
          ratio3: {
            gradient: '',
            sourceLink: '',
          },
          ratio4: {
            gradient: '#f3d36d',
            sourceLink: 'prem-nagar_har_eng_7_2.jpg',
          },
        },
        id: 2,
        square: {
          ratio1: {
            gradient: '#f4bd58',
            sourceLink: 'showImage-1647728834989.jpg',
          },
        },
        vertical: {
          ratio1: {
            gradient: '#f3d36d',
            sourceLink: 'prem-nagar_Har_Eng2x3.jpg',
          },
        },
      },
    ],
    artistList: [
      {
        callingName: 'Sanjeet Saroha',
        city: 'Bhiwani',
        display: 'Sanjeet Saroha',
        firstName: 'Sanjeet',
        gender: 'male',
        id: 103,
        lastName: 'Saroha',
        name: 'Sanjeet Saroha',
        order: 0,
        profilePic: 'oW1S3qFLtURHX4XzPQty.jpeg',
        slug: 'sanjeet-saroha',
        status: 'active',
      },
    ],
    categoryList: [
      {
        id: 8,
        name: 'nostalgia',
      },
      {
        id: 9,
        name: 'relationship',
      },
    ],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date('2021-12-24T09:23:26.645Z'),
    crossTrailer: 'prem-nagar---s2',
    defaultThumbnailIndex: 0,
    description:
      'Ya kahani se Sonu ki jo ek manchalya chhora se. Iss bin Maa ki chhori ki rukhal iska Babu Roshan karya kare. Roshan ka bs ek e sapna hai, Mera chhora padh-likhke khoob badiya number lyave. Isse khatar Roshan khave kamave se. Par Sonu ek bhayankar bimaari ka sikaar hojya se jisne kaya karein ISHQ. Ib Sonu Babu ka sapna pura kar pavega ya fer chhori ke sapne meh kuya ravega? Yo toh aapne puri web-series dekhe pache khud bera paat jyaga.',
    descriptorTags: [
      {
        id: 1010,
        name: 'Relatable',
      },
      {
        id: 1009,
        name: 'Thought-Provoking',
      },
      {
        id: 1013,
        name: 'Heartfelt',
      },
      {
        id: 1019,
        name: 'Dramatic',
      },
      {
        id: 1020,
        name: 'Emotional',
      },
      {
        id: 1032,
        name: 'Heartbreaking',
      },
    ],
    displayLanguage: Lang.EN,
    duration: 5502,
    endDate: new Date('2022-08-01T22:24:46.600Z'),
    englishValidated: true,
    episodeCount: 4,
    format: ContentFormat.STANDARD,
    genreList: [
      {
        id: 1024,
        name: 'Romance',
      },
      {
        id: 1008,
        name: 'Drama',
      },
      {
        id: 1010,
        name: 'Family',
      },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 0,
    isNewContent: false,
    isPopularContent: false,
    isPremium: true,
    isScheduled: false,
    keywordSearch: '',
    label: 'new',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    mediaAccessTier: 3,
    mediaList: [
      {
        duration: 172,
        hlsSourceLink: 'diEOblOSWTrcejY7ri.m3u8',
        id: 910,
        mediaType: PeripheralMediaType.TRAILER,
        selectedPeripheralStatus: true,
        sourceLink: 'diEOblOSWTrcejY7ri.mp4',
        subtitle: {
          en: '',
          hin: '',
        },
        thumbnail: {
          horizontal: {
            sourceLink: 'showImage-1644651782793.jpg',
          },
          square: {
            sourceLink: '',
          },
          vertical: {
            sourceLink: '',
          },
        },
        title: 'Prem Nagar - Trailer',
        type: 'show-peripheral',
        viewCount: 0,
        visionularHls: {
          hlsSourcelink: '',
          sourceLink: 'DiwM9MLXmfJJIwj1MrwN.mp4',
          status: 'pending',
          visionularTaskId: '202407082010cq64f94hq2p36mlj8scg',
        },
        visionularHlsH265: {
          hlsSourcelink: 'prem-nagar_1674136762770/playlist.m3u8',
          sourceLink: 'diEOblOSWTrcejY7ri.mp4',
          status: 'succeeded',
          visionularTaskId: '202301191359233288452711e9e44d9d',
        },
        visionularHlsHistory: ['202407082010cq64f94hq2p36mlj8scg'],
      },
      {
        duration: 44,
        hlsSourceLink: 'tKKZodPyDakkAfBNBx.m3u8',
        id: 681,
        mediaType: PeripheralMediaType.CLIP,
        selectedPeripheralStatus: false,
        sourceLink: 'tKKZodPyDakkAfBNBx.mp4',
        subtitle: {
          en: '',
          hin: '',
        },
        thumbnail: {
          horizontal: {
            sourceLink: 'showImage-1644651798746.jpg',
          },
          square: {
            sourceLink: '',
          },
          vertical: {
            sourceLink: '',
          },
        },
        title: 'Prem Nagar - Teaser',
        type: 'show-peripheral',
        viewCount: 0,
        visionularHls: {
          hlsSourcelink: 'tKKZodPyDakkAfBNBx_1675158214165/playlist.m3u8',
          sourceLink: 'tKKZodPyDakkAfBNBx.mp4',
          status: 'succeeded',
          visionularTaskId: '202301310943351174600721c97e5f1c',
        },
        visionularHlsH265: {
          hlsSourcelink: 'tKKZodPyDakkAfBNBx_1675158217724/playlist.m3u8',
          sourceLink: 'tKKZodPyDakkAfBNBx.mp4',
          status: 'succeeded',
          visionularTaskId: '2023013109433830642944295a6d647c',
        },
        visionularHlsHistory: ['202301310943351174600721c97e5f1c'],
      },
    ],
    metaDescription:
      'Ya kahani se Sonu ki jo ek manchalya chhora se. Iss bin Maa ki chhori ki rukhal iska Babu Roshan karya kare. Roshan ka bs ek e sapna hai, Mera chhora padh-likhke khoob badiya number lyave. Isse khatar Roshan khave kamave se. Par Sonu ek bhayankar bimaari ka sikaar hojya se jisne kaya karein ISHQ. Ib Sonu Babu ka sapna pura kar pavega ya fer chhori ke sapne meh kuya ravega? Yo toh aapne puri web-series dekhe pache khud bera paat jyaga.',
    metaKeyword: 'Prem Nagar,Original',
    metaTitle: 'Prem Nagar',
    mlTags:
      'love story, family issues,father son relation,small village, school life,friendship, romance, board exams, distraction, \nfailure, sonu, raveena',
    moods: [
      {
        id: 1007,
        name: 'Emotional',
      },
      {
        id: 1010,
        name: 'Hopeful',
      },
      {
        id: 1021,
        name: 'Sympathetic',
      },
    ],
    order: 0,
    peripheralCount: 2,
    plotKeywords: [
      'Teenage Romance',
      'School Romance',
      'Love marriage',
      'Love Story',
      'Intercast Love',
      'Forbidden Love',
    ],
    preContentWarningText: '',
    premiumNessOrder: 27,
    publishCount: 4,
    randomOrder: 0,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2022-02-14T00:00:00.000Z',
    seasonCount: 1,
    selectedPeripheral: {
      duration: 172,
      hlsSourceLink: 'diEOblOSWTrcejY7ri.m3u8',
      sourceLink: 'diEOblOSWTrcejY7ri.mp4',
      thumbnail: {
        horizontal: {
          sourceLink: 'showImage-1644651782793.jpg',
        },
        square: {
          sourceLink: '',
        },
        vertical: {
          sourceLink: '',
        },
      },
      title: 'Prem Nagar - Trailer',
      type: 'show-peripheral',
      viewCount: 0,
      visionularHls: {
        hlsSourcelink: 'prem-nagar_1674136765608/playlist.m3u8',
        sourceLink: 'diEOblOSWTrcejY7ri.mp4',
        status: 'succeeded',
        visionularTaskId: '20230119135926174785147eafef9203',
      },
      visionularHlsH265: {
        hlsSourcelink: 'prem-nagar_1674136762770/playlist.m3u8',
        sourceLink: 'diEOblOSWTrcejY7ri.mp4',
        status: 'succeeded',
        visionularTaskId: '202301191359233288452711e9e44d9d',
      },
    },
    slug: 'prem-nagar',
    startDate: new Date('2022-02-07T12:00:05.408Z'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 1051,
        name: 'Romantic Drama',
      },
      {
        id: 1053,
        name: 'Family Drama',
      },
      {
        id: 1054,
        name: 'Social Drama',
      },
      {
        id: 1062,
        name: 'Family Drama',
      },
      {
        id: 1133,
        name: 'Romantic Drama',
      },
    ],
    tags: 'Prem Nagar,Pram Nagar,Preem Nagar,Pram Nagar,Praam Nagar,Premnagar,Preemnagar,Pramnagar,Praamnagar,pre,prem,Prem nagar 1,prem nagar season 1',
    themes: [
      {
        id: 1009,
        name: 'Caste Issues',
      },
      {
        id: 1010,
        name: 'Change vs Tradition',
      },
      {
        id: 1011,
        name: 'Coming of Age',
      },
      {
        id: 1013,
        name: 'Class Struggle',
      },
      {
        id: 1045,
        name: 'Love',
      },
      {
        id: 1043,
        name: 'Loss of Innocence',
      },
      {
        id: 1078,
        name: 'Sacrificing for Love',
      },
      {
        id: 1096,
        name: 'Teenage Angst',
      },
    ],
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#f3d36d',
          sourceLink: 'showImage-1644651730319.jpg',
        },
        ratio2: {
          gradient: '#f3d36d',
          sourceLink: 'showImage-1644651758278.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: 'Prem_Nagar_Eng_HAR_TV.jpg',
        },
        ratio4: {
          gradient: '#f3d36d',
          sourceLink: 'prem-nagar_har_eng_7_2.jpg',
        },
      },
      square: {
        ratio1: {
          gradient: '#f3d36d',
          sourceLink: 'showImage-1644651758278.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#f3d36d',
          sourceLink: 'prem-nagar_Har_Eng2x3.jpg',
        },
      },
    },
    title: 'Prem Nagar',
    updatedAt: new Date('2025-01-22T13:09:44.535Z'),
    videoFormatDetail: [
      {
        bitRate: 240,
        label: '240px',
        size: 144.95,
      },
      {
        bitRate: 720,
        label: '720px',
        size: 447.90999999999997,
      },
      {
        bitRate: 1080,
        label: '1080px',
        size: 589.77,
      },
      {
        bitRate: 480,
        label: '480px',
        size: 309.28999999999996,
      },
      {
        bitRate: 360,
        label: '360px',
        size: 209.64000000000001,
      },
    ],
    viewCount: 0,
    visionularHls: {
      hlsSourcelink: 'undefined_1720469410974/playlist.m3u8',
      sourceLink: 'DiwM9MLXmfJJIwj1MrwN.mp4',
      status: 'succeeded',
      visionularTaskId: '202407082010cq64f94hq2p36mlj8scg',
    },
  },
  {
    _id: 443,
    allThumbnails: [
      {
        horizontal: {
          ratio1: {
            gradient: '#3b3330',
            sourceLink: 'showImage-1653383421904.jpg',
          },
          ratio2: {
            gradient: '#3b3330',
            sourceLink: 'showImage-1653383468824.jpg',
          },
          ratio3: {
            gradient: '#3b3330',
            sourceLink: 'showImage-1667983548201.jpg',
          },
          ratio4: {
            gradient: '#3b3330',
            sourceLink: 'prem-nagar---s2_har_eng_7_2.jpg',
          },
        },
        id: 1,
        square: {
          ratio1: {
            gradient: '#3b3330',
            sourceLink: 'showImage-1653383468824.jpg',
          },
        },
        vertical: {
          ratio1: {
            gradient: '#3b3330',
            sourceLink: 'prem-nagar---s2_Har_En_2x3.jpg',
          },
        },
      },
    ],
    artistList: [
      {
        callingName: 'Sanjeet Saroha',
        city: 'Bhiwani',
        display: 'Sanjeet Saroha',
        firstName: 'Sanjeet',
        gender: 'male',
        id: 103,
        lastName: 'Saroha',
        name: 'Sanjeet Saroha',
        order: 0,
        profilePic: 'oW1S3qFLtURHX4XzPQty.jpeg',
        slug: 'sanjeet-saroha',
        status: 'active',
      },
    ],
    categoryList: [
      {
        id: 9,
        name: 'relationship',
      },
      {
        id: 15,
        name: 'lifeStyle',
      },
    ],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date('2022-04-04T11:03:54.996Z'),
    crossTrailer: 'mere-yaar-ki-shaadi',
    defaultThumbnailIndex: 0,
    description:
      'Ya kahani se Sonu ki jo ek manchalya chhora se. Iss bin Maa ki chhori ki rukhal iska Babu Roshan karya kare. Roshan ka bs ek e sapna hai, Mera chhora padh-likhke khoob badiya number lyave. Isse khatar Roshan khave kamave se. Par Sonu ek bhayankar bimaari ka sikaar hojya se jisne kaya karein ISHQ. Ib Sonu Babu ka sapna pura kar pavega ya fer chhori ke sapne meh kuya ravega? Yo toh aapne puri web-series dekhe pache khud bera paat jyaga.',
    descriptorTags: [
      {
        id: 1010,
        name: 'Relatable',
      },
      {
        id: 1011,
        name: 'Complex',
      },
      {
        id: 1009,
        name: 'Thought-Provoking',
      },
      {
        id: 1016,
        name: 'Tragic',
      },
      {
        id: 1019,
        name: 'Dramatic',
      },
      {
        id: 1020,
        name: 'Emotional',
      },
      {
        id: 1023,
        name: 'Sensitive',
      },
      {
        id: 1032,
        name: 'Heartbreaking',
      },
    ],
    displayLanguage: Lang.EN,
    duration: 7807,
    endDate: new Date('2022-11-09T08:46:19.847Z'),
    englishValidated: true,
    episodeCount: 6,
    format: ContentFormat.STANDARD,
    genreList: [
      {
        id: 1024,
        name: 'Romance',
      },
      {
        id: 1008,
        name: 'Drama',
      },
      {
        id: 1010,
        name: 'Family',
      },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 0,
    isNewContent: false,
    isPopularContent: false,
    isPremium: true,
    isScheduled: false,
    keywordSearch: '',
    label: 'new',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    mediaAccessTier: 3,
    mediaList: [
      {
        duration: 165,
        hlsSourceLink: 'VyetsWs70ysxl4Seup.m3u8',
        id: 131,
        mediaType: PeripheralMediaType.TRAILER,
        selectedPeripheralStatus: true,
        sourceLink: 'VyetsWs70ysxl4Seup.mp4',
        subtitle: {
          en: '',
          hin: '',
        },
        thumbnail: {
          horizontal: {
            sourceLink: 'showImage-1653383499279.jpg',
          },
          square: {
            sourceLink: '',
          },
          vertical: {
            sourceLink: '',
          },
        },
        title: 'Prem Nagar - Season 2 - Trailer',
        type: 'show-peripheral',
        viewCount: 0,
        visionularHls: {
          hlsSourcelink: '',
          sourceLink: 'DiwM9MLXmfJJIwj1MrwN.mp4',
          status: 'pending',
          visionularTaskId: '202407082010cq64f94hq2p36mlj8scg',
        },
        visionularHlsH265: {
          hlsSourcelink: 'prem-nagar---s2_1674136770409/playlist.m3u8',
          sourceLink: 'VyetsWs70ysxl4Seup.mp4',
          status: 'succeeded',
          visionularTaskId: '202301191359309584172570e6cccf1b',
        },
        visionularHlsHistory: ['202407082010cq64f94hq2p36mlj8scg'],
      },
    ],
    metaDescription:
      'Ya kahani se Sonu ki jo ek manchalya chhora se. Iss bin Maa ki chhori ki rukhal iska Babu Roshan karya kare. Roshan ka bs ek e sapna hai, Mera chhora padh-likhke khoob badiya number lyave. Isse khatar Roshan khave kamave se. Par Sonu ek bhayankar bimaari ka sikaar hojya se jisne kaya karein ISHQ. Ib Sonu Babu ka sapna pura kar pavega ya fer chhori ke sapne meh kuya ravega? Yo toh aapne puri web-series dekhe pache khud bera paat jyaga.',
    metaKeyword: 'Prem Nagar - Season 2',
    metaTitle: 'Prem Nagar - Season 2',
    mlTags:
      'mystery, suspense, past life,unfulfilled dreams,planning and ploting,honour killing, murder, heartbreak, sonu, raveena, roshan',
    moods: [
      {
        id: 1005,
        name: 'Anger',
      },
      {
        id: 1007,
        name: 'Emotional',
      },
      {
        id: 1010,
        name: 'Hopeful',
      },
      {
        id: 1018,
        name: 'Sad',
      },
      {
        id: 1021,
        name: 'Sympathetic',
      },
    ],
    order: 0,
    peripheralCount: 1,
    plotKeywords: [
      'Teenage Romance',
      'School Romance',
      'Love marriage',
      'Love Story',
      'Intercast Love',
      'Forbidden Love',
      'Honour killing',
      'Family Honour',
      'Family Rivalry',
    ],
    preContentWarningText: '',
    premiumNessOrder: 45,
    publishCount: 3,
    randomOrder: 0,
    referenceShowArr: [
      {
        display: 'Prem Nagar',
        id: 309,
        slug: 'prem-nagar',
        title: 'Prem Nagar',
        value: 309,
      },
    ],
    referenceShowIds: [309],
    referenceShowSlugs: ['prem-nagar'],
    releaseDate: '2022-05-25T00:00:00.000Z',
    seasonCount: 1,
    selectedPeripheral: {
      duration: 165,
      hlsSourceLink: 'VyetsWs70ysxl4Seup.m3u8',
      sourceLink: 'VyetsWs70ysxl4Seup.mp4',
      thumbnail: {
        horizontal: {
          sourceLink: 'showImage-1653383499279.jpg',
        },
        square: {
          sourceLink: '',
        },
        vertical: {
          sourceLink: '',
        },
      },
      title: 'Prem Nagar - Season 2 - Trailer',
      type: 'show-peripheral',
      viewCount: 0,
      visionularHls: {
        hlsSourcelink: 'prem-nagar---s2_1674136766769/playlist.m3u8',
        sourceLink: 'VyetsWs70ysxl4Seup.mp4',
        status: 'succeeded',
        visionularTaskId: '20230119135927344694050434006723',
      },
      visionularHlsH265: {
        hlsSourcelink: 'prem-nagar---s2_1674136770409/playlist.m3u8',
        sourceLink: 'VyetsWs70ysxl4Seup.mp4',
        status: 'succeeded',
        visionularTaskId: '202301191359309584172570e6cccf1b',
      },
    },
    slug: 'prem-nagar---s2',
    startDate: new Date('2022-05-17T16:29:21.016Z'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 1051,
        name: 'Romantic Drama',
      },
      {
        id: 1053,
        name: 'Family Drama',
      },
      {
        id: 1054,
        name: 'Social Drama',
      },
      {
        id: 1062,
        name: 'Family Drama',
      },
      {
        id: 1133,
        name: 'Romantic Drama',
      },
    ],
    tags: 'Prem Nagar Season 2,Prem Nagar Season 2,Prem Nagar  S2,Preem Nagar  Season 2,Preem Nagar  S2,Pram Nagar  Season 2,Pram Nagar  S2,Prem Nager Season 2,Prem Nager S2,prem,love,pre',
    themes: [
      {
        id: 1009,
        name: 'Caste Issues',
      },
      {
        id: 1010,
        name: 'Change vs Tradition',
      },
      {
        id: 1011,
        name: 'Coming of Age',
      },
      {
        id: 1013,
        name: 'Class Struggle',
      },
      {
        id: 1026,
        name: 'Family Issues',
      },
      {
        id: 1045,
        name: 'Love',
      },
      {
        id: 1043,
        name: 'Loss of Innocence',
      },
      {
        id: 1078,
        name: 'Sacrificing for Love',
      },
      {
        id: 1096,
        name: 'Teenage Angst',
      },
    ],
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#3b3330',
          sourceLink: 'showImage-1653383421904.jpg',
        },
        ratio2: {
          gradient: '#3b3330',
          sourceLink: 'showImage-1653383468824.jpg',
        },
        ratio3: {
          gradient: '#3b3330',
          sourceLink: 'showImage-1667983548201.jpg',
        },
        ratio4: {
          gradient: '#3b3330',
          sourceLink: 'prem-nagar---s2_har_eng_7_2.jpg',
        },
      },
      square: {
        ratio1: {
          gradient: '#3b3330',
          sourceLink: 'showImage-1653383468824.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#3b3330',
          sourceLink: 'prem-nagar---s2_Har_En_2x3.jpg',
        },
      },
    },
    title: 'Prem Nagar - Season 2',
    updatedAt: new Date('2025-01-22T13:09:44.535Z'),
    videoFormatDetail: [
      {
        bitRate: 480,
        label: '480px',
        size: 438.3,
      },
      {
        bitRate: 360,
        label: '360px',
        size: 297.54,
      },
      {
        bitRate: 1080,
        label: '1080px',
        size: 834.24,
      },
      {
        bitRate: 240,
        label: '240px',
        size: 205.89,
      },
      {
        bitRate: 720,
        label: '720px',
        size: 629.66,
      },
    ],
    viewCount: 0,
    visionularHls: {
      hlsSourcelink: 'undefined_1720469410974/playlist.m3u8',
      sourceLink: 'DiwM9MLXmfJJIwj1MrwN.mp4',
      status: 'succeeded',
      visionularTaskId: '202407082010cq64f94hq2p36mlj8scg',
    },
  },
  {
    _id: 13,
    artistList: [
      {
        callingName: 'Ramnath Shastri',
        city: 'Haryana',
        display: '',
        firstName: 'Ramnath',
        gender: '',
        gradient: '',
        id: 1,
        lastName: 'Shastri',
        name: 'Ramnath Shastri',
        order: 1,
        profilePic: '',
        slug: 'ramnath-shastri',
        status: 'active',
      },
    ],
    categoryList: [
      {
        id: 9,
        name: 'relationship',
      },
    ],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date(),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description:
      'Haryana main saksharta dar kum hone ki wajah se log aksar ladkiyon ko ladkon se kum aankte hain...',
    descriptorTags: [
      { id: 1005, name: 'Moving' },
      { id: 1009, name: 'Thought-Provoking' },
      { id: 1013, name: 'Heartfelt' },
      { id: 1022, name: 'Hard-hitting' },
      { id: 1064, name: 'Social Commentary' },
    ],
    displayLanguage: Lang.EN,
    duration: 1743,
    endDate: new Date('2022-08-01T22:24:46.600Z'),
    englishValidated: true,
    episodeCount: 5,
    format: ContentFormat.STANDARD,
    genreList: [
      { id: 2, name: 'Poetry' },
      { id: 1012, name: 'Folk' },
      { id: 1015, name: 'Music' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 2,
    isNewContent: false,
    isPopularContent: false,
    isPremium: true,
    isScheduled: false,
    keywordSearch: '',
    label: 'viral',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    mediaAccessTier: 3,
    mediaList: [],
    metaDescription:
      'Haryana main saksharta dar kum hone ki wajah se log aksar ladkiyon ko ladkon se kum aankte hain...',
    metaKeyword: 'Choriyan Bojh Na Hoti,Ramnath Shastri,Dayal Chand',
    metasTags: [],
    metaTitle: 'Choriyan Bojh Na Hoti',
    mlTags:
      'feminism, social issues, haryana ki beti, betiya, poems, inspiring, motivation, sattire, domestic, social rights, empowerment, education, dark truth',
    moods: [
      { id: 1007, name: 'Emotional' },
      { id: 1017, name: 'Reflective' },
      { id: 1021, name: 'Sympathetic' },
    ],
    order: 2,
    peripheralCount: 1,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 4,
    randomOrder: 118,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2019-10-23',
    seasonCount: 1,
    selectedPeripheral: {
      duration: 94,
      hlsSourceLink: '07j65rsnLKfpTaCTe6fR.m3u8',
      sourceLink: '07j65rsnLKfpTaCTe6fR.mp4',
      thumbnail: {
        horizontal: { sourceLink: 'showImage-1588584164861.jpg' },
        square: { sourceLink: '' },
        vertical: { sourceLink: '' },
      },
      title: 'Choriyan Bojh Na Hoti - Season 1',
      type: 'show-peripheral',
      viewCount: 1622,
      visionularHls: {
        hlsSourcelink: 'choriyaan-bojh-na-hoti_1674134175264/playlist.m3u8',
        sourceLink: '07j65rsnLKfpTaCTe6fR.mp4',
        status: 'succeeded',
        visionularTaskId: '202301191316158054445767f925131c',
      },
      visionularHlsH265: {
        hlsSourcelink: 'choriyaan-bojh-na-hoti_1674134195408/playlist.m3u8',
        sourceLink: '07j65rsnLKfpTaCTe6fR.mp4',
        status: 'succeeded',
        visionularTaskId: '202301191316359483898053b0491289',
      },
    },
    slug: 'choriyaan-bojh-na-hoti',
    startDate: new Date('2022-02-07T12:00:05.408Z'),
    status: ShowStatus.ACTIVE,
    subGenreList: [{ id: 1084, name: 'Folk Music' }],
    tags: 'Choriyan Bojh Na Hoti,Ramnath Shastri,Dayal Chand',
    themes: [
      { id: 1051, name: 'Marriage' },
      { id: 1085, name: 'Social Evils' },
      { id: 1086, name: 'Social Issues' },
      { id: 1107, name: 'Women Empowerment' },
    ],
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#92542e',
          sourceLink: 'showImage-1588584118859.jpg',
        },
        ratio2: {
          gradient: '#92542e',
          sourceLink: 'showImage-1594971313892.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
        ratio4: {
          gradient: '#92542e',
          sourceLink: 'choriyaan-bojh-na-hoti_har_eng_7_2.jpg',
        },
      },
      square: {
        ratio1: {
          gradient: '#92542e',
          sourceLink: 'showImage-1594971313892.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#92542e',
          sourceLink: 'choriyaan-bojh-na-hoti_har_eng.jpg',
        },
      },
    },
    title: 'Choriyan Bojh Na Hoti',
    updatedAt: new Date(),
    videoFormatDetail: [
      { bitRate: 240, label: '240px', size: 47.08 },
      { bitRate: 1080, label: '1080px', size: 180.91 },
      { bitRate: 720, label: '720px', size: 138.02 },
      { bitRate: 360, label: '360px', size: 66.45 },
      { bitRate: 480, label: '480px', size: 96.61 },
    ],
    viewCount: 10,
    visionularHls: {
      hlsSourcelink: 'undefined_1720469410974/playlist.m3u8',
      sourceLink: 'DiwM9MLXmfJJIwj1MrwN.mp4',
      status: 'succeeded',
      visionularTaskId: '202407082010cq64f94hq2p36mlj8scg',
    },
  },
  {
    _id: 1001,
    artistList: [
      {
        callingName: 'Priya Sharma',
        city: 'Haryana',
        display: '',
        firstName: 'Priya',
        gender: '',
        gradient: '',
        id: 101,
        lastName: 'Sharma',
        name: 'Priya Sharma',
        order: 1,
        profilePic: '',
        slug: 'priya-sharma',
        status: 'active',
      },
    ],
    categoryList: [],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date('2024-01-15'),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description:
      'A short micro drama about family relationships and modern values in Haryana.',
    displayLanguage: Lang.EN,
    duration: 180,
    endDate: new Date('2024-12-31'),
    englishValidated: true,
    episodeCount: 1,
    format: ContentFormat.MICRO_DRAMA,
    genreList: [
      { id: 3, name: 'Drama' },
      { id: 4, name: 'Family' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 1,
    isNewContent: true,
    isPopularContent: false,
    isPremium: false,
    isScheduled: false,
    keywordSearch: 'micro drama, family, haryana',
    language: Dialect.HAR,
    likeConsumptionRatio: 0,
    likeCount: 0,
    metaDescription:
      'A short micro drama about family relationships and modern values in Haryana.',
    metaKeyword: 'micro drama, family, haryana',
    metaTitle: 'Family Values - Micro Drama',
    mlTags: 'family, relationships, modern values, haryana, micro drama',
    order: 1,
    peripheralCount: 0,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 1,
    randomOrder: 50,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2024-01-15',
    seasonCount: 1,
    slug: 'family-values-micro-drama',
    startDate: new Date('2024-01-15'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 24,
        name: 'karuna-ras',
      },
    ],
    tags: 'Family Values, Micro Drama, Haryana',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#4a90e2',
          sourceLink: 'microdrama-1-horizontal.jpg',
        },
        ratio2: {
          gradient: '#4a90e2',
          sourceLink: 'microdrama-1-horizontal-2.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: '#4a90e2',
          sourceLink: 'microdrama-1-square.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#4a90e2',
          sourceLink: 'microdrama-1-vertical.jpg',
        },
      },
    },
    title: 'Family Values',
    updatedAt: new Date('2024-01-15'),
    viewCount: 150,
  },
  {
    _id: 1002,
    artistList: [
      {
        callingName: 'Rajesh Kumar',
        city: 'Bihar',
        display: '',
        firstName: 'Rajesh',
        gender: '',
        gradient: '',
        id: 102,
        lastName: 'Kumar',
        name: 'Rajesh Kumar',
        order: 1,
        profilePic: '',
        slug: 'rajesh-kumar',
        status: 'active',
      },
    ],
    categoryList: [],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date('2024-02-20'),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description: 'A micro drama exploring social issues in Bhojpuri culture.',
    displayLanguage: Lang.HIN,
    duration: 200,
    endDate: new Date('2024-12-31'),
    englishValidated: true,
    episodeCount: 1,
    format: ContentFormat.MICRO_DRAMA,
    genreList: [
      { id: 3, name: 'Drama' },
      { id: 5, name: 'Social' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 1,
    isNewContent: true,
    isPopularContent: false,
    isPremium: false,
    isScheduled: false,
    keywordSearch: 'micro drama, social issues, bhojpuri',
    language: Dialect.BHO,
    likeConsumptionRatio: 0,
    likeCount: 0,
    metaDescription:
      'A micro drama exploring social issues in Bhojpuri culture.',
    metaKeyword: 'micro drama, social issues, bhojpuri',
    metaTitle: 'Social Issues - Micro Drama',
    mlTags: 'social issues, bhojpuri, micro drama, culture',
    order: 2,
    peripheralCount: 0,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 1,
    randomOrder: 51,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2024-02-20',
    seasonCount: 1,
    slug: 'social-issues-micro-drama',
    startDate: new Date('2024-02-20'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 26,
        name: 'roudra-ras',
      },
    ],
    tags: 'Social Issues, Micro Drama, Bhojpuri',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#e74c3c',
          sourceLink: 'microdrama-2-horizontal.jpg',
        },
        ratio2: {
          gradient: '#e74c3c',
          sourceLink: 'microdrama-2-horizontal-2.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: '#e74c3c',
          sourceLink: 'microdrama-2-square.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#e74c3c',
          sourceLink: 'microdrama-2-vertical.jpg',
        },
      },
    },
    title: 'Social Issues',
    updatedAt: new Date('2024-02-20'),
    viewCount: 200,
  },
  {
    _id: 1003,
    artistList: [
      {
        callingName: 'Sunita Devi',
        city: 'Rajasthan',
        display: '',
        firstName: 'Sunita',
        gender: '',
        gradient: '',
        id: 103,
        lastName: 'Devi',
        name: 'Sunita Devi',
        order: 1,
        profilePic: '',
        slug: 'sunita-devi',
        status: 'active',
      },
    ],
    categoryList: [],
    complianceList: [],
    complianceRating: '',
    consumptionRateCount: 0,
    contributionField: '',
    createdAt: new Date('2024-03-10'),
    crossTrailer: '',
    defaultThumbnailIndex: 0,
    description: 'A micro drama about traditional values in modern Rajasthan.',
    displayLanguage: Lang.EN,
    duration: 160,
    endDate: new Date('2024-12-31'),
    englishValidated: true,
    episodeCount: 1,
    format: ContentFormat.MICRO_DRAMA,
    genreList: [
      { id: 3, name: 'Drama' },
      { id: 6, name: 'Traditional' },
    ],
    hindiValidated: true,
    isExclusive: 0,
    isExclusiveOrder: 1,
    isNewContent: true,
    isPopularContent: false,
    isPremium: false,
    isScheduled: false,
    keywordSearch: 'micro drama, traditional, rajasthan',
    language: Dialect.RAJ,
    likeConsumptionRatio: 0,
    likeCount: 0,
    metaDescription:
      'A micro drama about traditional values in modern Rajasthan.',
    metaKeyword: 'micro drama, traditional, rajasthan',
    metaTitle: 'Traditional Values - Micro Drama',
    mlTags: 'traditional values, rajasthan, micro drama, culture',
    order: 3,
    peripheralCount: 0,
    preContentWarningText: '',
    premiumNessOrder: -1,
    publishCount: 1,
    randomOrder: 52,
    referenceShowArr: [],
    referenceShowIds: [],
    referenceShowSlugs: [],
    releaseDate: '2024-03-10',
    seasonCount: 1,
    slug: 'traditional-values-micro-drama',
    startDate: new Date('2024-03-10'),
    status: ShowStatus.ACTIVE,
    subGenreList: [
      {
        id: 25,
        name: 'adbhut-ras',
      },
    ],
    tags: 'Traditional Values, Micro Drama, Rajasthan',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#f39c12',
          sourceLink: 'microdrama-3-horizontal.jpg',
        },
        ratio2: {
          gradient: '#f39c12',
          sourceLink: 'microdrama-3-horizontal-2.jpg',
        },
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: '#f39c12',
          sourceLink: 'microdrama-3-square.jpg',
        },
      },
      vertical: {
        ratio1: {
          gradient: '#f39c12',
          sourceLink: 'microdrama-3-vertical.jpg',
        },
      },
    },
    title: 'Traditional Values',
    updatedAt: new Date('2024-03-10'),
    viewCount: 100,
  },
];
