import { ReelStatusEnum, ReelType } from '@app/common/entities/reel.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { ObjectId } from 'mongodb';

export const reelsData = [
  {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    contentSlug: 'choriyaan-bojh-na-hoti', // Show with displayLanguage: Lang.HIN
    contentType: ContentType.SHOW,
    description: {
      [Lang.EN]: 'Behind the scenes of our amazing show',
      [Lang.HIN]: 'हमारे अद्भुत शो के पीछे की कहानी',
    },
    dialect: Dialect.HAR,
    duration: 120,
    likes: 150,
    plotKeywords: {
      [Lang.EN]: ['behind the scenes', 'making of', 'exclusive'],
      [Lang.HIN]: ['पीछे की कहानी', 'बनाने की प्रक्रिया', 'विशेष'],
    },
    reelType: ReelType.BEHIND_THE_SCENES,
    shareCount: 25,
    shareLink: 'https://share.example.com/reel1',
    status: ReelStatusEnum.PUBLISHED,
    statusHistory: [
      {
        status: ReelStatusEnum.DRAFT,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      },
      {
        status: ReelStatusEnum.PUBLISHED,
        timestamp: new Date('2024-01-02T00:00:00Z'),
      },
    ],
    thumbnail: {
      ratio_9_16: {
        [Lang.EN]: 'https://example.com/thumbnail1-en.jpg',
        [Lang.HIN]: 'https://example.com/thumbnail1-hin.jpg',
      },
    },
    title: {
      [Lang.EN]: 'Behind the Scenes: Episode 1',
      [Lang.HIN]: 'पीछे की कहानी: एपिसोड 1',
    },
    views: 1000,
    visionularHls: {
      hlsSourcelink: 'reel1.m3u8',
      sourceLink: 'reel1.mp4',
    },
    visionularHlsH265: null,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799439012'),
    contentSlug: 'choriyaan-bojh-na-hoti',
    contentType: ContentType.SHOW,
    description: {
      [Lang.EN]: 'Funny bloopers from the set',
      [Lang.HIN]: 'सेट से मज़ेदार ब्लूपर्स',
    },
    dialect: Dialect.HAR,
    duration: 90,
    likes: 200,
    plotKeywords: {
      [Lang.EN]: ['bloopers', 'funny', 'outtakes'],
      [Lang.HIN]: ['ब्लूपर्स', 'मज़ेदार', 'आउटटेक्स'],
    },
    reelType: ReelType.BLOOPERS,
    shareCount: 40,
    shareLink: 'https://share.example.com/reel2',
    status: ReelStatusEnum.PUBLISHED,
    statusHistory: [
      {
        status: ReelStatusEnum.DRAFT,
        timestamp: new Date('2024-01-03T00:00:00Z'),
      },
      {
        status: ReelStatusEnum.PUBLISHED,
        timestamp: new Date('2024-01-04T00:00:00Z'),
      },
    ],
    thumbnail: {
      ratio_9_16: {
        [Lang.EN]: 'https://example.com/thumbnail2-en.jpg',
        [Lang.HIN]: 'https://example.com/thumbnail2-hin.jpg',
      },
    },
    title: {
      [Lang.EN]: 'Funny Bloopers Compilation',
      [Lang.HIN]: 'मज़ेदार ब्लूपर्स संकलन',
    },
    views: 1500,
    visionularHls: {
      hlsSourcelink: 'reel2.m3u8',
      sourceLink: 'reel2.mp4',
    },
    visionularHlsH265: null,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799439013'),
    contentSlug: 'hindi-movie-for-reels', // Movie with displayLanguage: Lang.HIN
    contentType: ContentType.MOVIE,
    description: {
      [Lang.EN]: 'Cast interviews and insights',
      [Lang.HIN]: 'कलाकारों के साक्षात्कार और अंतर्दृष्टि',
    },
    dialect: Dialect.HAR,
    duration: 180,
    likes: 300,
    plotKeywords: {
      [Lang.EN]: ['interviews', 'cast', 'insights'],
      [Lang.HIN]: ['साक्षात्कार', 'कलाकार', 'अंतर्दृष्टि'],
    },
    reelType: ReelType.CAST_INTERVIEWS,
    shareCount: 60,
    shareLink: 'https://share.example.com/reel3',
    status: ReelStatusEnum.PUBLISHED,
    statusHistory: [
      {
        status: ReelStatusEnum.DRAFT,
        timestamp: new Date('2024-01-05T00:00:00Z'),
      },
      {
        status: ReelStatusEnum.PUBLISHED,
        timestamp: new Date('2024-01-06T00:00:00Z'),
      },
    ],
    thumbnail: {
      ratio_9_16: {
        [Lang.EN]: 'https://example.com/thumbnail3-en.jpg',
        [Lang.HIN]: 'https://example.com/thumbnail3-hin.jpg',
      },
    },
    title: {
      [Lang.EN]: 'Cast Interviews: The Making',
      [Lang.HIN]: 'कलाकारों के साक्षात्कार: निर्माण',
    },
    views: 2000,
    visionularHls: {
      hlsSourcelink: 'reel3.m3u8',
      sourceLink: 'reel3.mp4',
    },
    visionularHlsH265: null,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799439014'),
    contentSlug: 'prem-nagar---s2',
    contentType: ContentType.SHOW,
    description: {
      [Lang.EN]: 'Short teaser for upcoming episodes',
      [Lang.HIN]: 'आगामी एपिसोड के लिए छोटा टीज़र',
    },
    dialect: Dialect.HAR,
    duration: 60,
    likes: 100,
    plotKeywords: {
      [Lang.EN]: ['teaser', 'upcoming', 'preview'],
      [Lang.HIN]: ['टीज़र', 'आगामी', 'पूर्वावलोकन'],
    },
    reelType: ReelType.SHORT_TEASERS,
    shareCount: 15,
    shareLink: 'https://share.example.com/reel4',
    status: ReelStatusEnum.PUBLISHED,
    statusHistory: [
      {
        status: ReelStatusEnum.DRAFT,
        timestamp: new Date('2024-01-07T00:00:00Z'),
      },
      {
        status: ReelStatusEnum.PUBLISHED,
        timestamp: new Date('2024-01-08T00:00:00Z'),
      },
    ],
    thumbnail: {
      ratio_9_16: {
        [Lang.EN]: 'https://example.com/thumbnail4-en.jpg',
        [Lang.HIN]: 'https://example.com/thumbnail4-hin.jpg',
      },
    },
    title: {
      [Lang.EN]: 'Upcoming Episode Teaser',
      [Lang.HIN]: 'आगामी एपिसोड टीज़र',
    },
    views: 800,
    visionularHls: {
      hlsSourcelink: 'reel4.m3u8',
      sourceLink: 'reel4.mp4',
    },
    visionularHlsH265: null,
  },
  {
    _id: new ObjectId('507f1f77bcf86cd799439015'),
    contentSlug: 'sample-individual-episode',
    contentType: ContentType.MOVIE,
    description: {
      [Lang.EN]: 'Character promos and highlights',
      [Lang.HIN]: 'पात्र प्रोमो और हाइलाइट्स',
    },
    dialect: Dialect.HAR,
    duration: 150,
    likes: 250,
    plotKeywords: {
      [Lang.EN]: ['character', 'promo', 'highlights'],
      [Lang.HIN]: ['पात्र', 'प्रोमो', 'हाइलाइट्स'],
    },
    reelType: ReelType.CHARACTER_PROMOS,
    shareCount: 35,
    shareLink: 'https://share.example.com/reel5',
    status: ReelStatusEnum.PUBLISHED,
    statusHistory: [
      {
        status: ReelStatusEnum.DRAFT,
        timestamp: new Date('2024-01-09T00:00:00Z'),
      },
      {
        status: ReelStatusEnum.PUBLISHED,
        timestamp: new Date('2024-01-10T00:00:00Z'),
      },
    ],
    thumbnail: {
      ratio_9_16: {
        [Lang.EN]: 'https://example.com/thumbnail5-en.jpg',
        [Lang.HIN]: 'https://example.com/thumbnail5-hin.jpg',
      },
    },
    title: {
      [Lang.EN]: 'Character Promos: Meet the Cast',
      [Lang.HIN]: 'पात्र प्रोमो: कलाकारों से मिलें',
    },
    views: 1200,
    visionularHls: {
      hlsSourcelink: 'reel5.m3u8',
      sourceLink: 'reel5.mp4',
    },
    visionularHlsH265: null,
  },
];
