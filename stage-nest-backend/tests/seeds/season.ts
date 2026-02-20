import { Document } from 'mongoose';

import { Lang } from '@app/common/enums/app.enum';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { Season, SeasonStatus } from 'src/content/entities/season.entity';

export const seasonData: Omit<Season, Exclude<keyof Document, '_id'>>[] = [
  {
    _id: 311,
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
          ratio3: { gradient: '', sourceLink: '' },
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
          ratio3: { gradient: '', sourceLink: '' },
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
        value: 103,
      },
    ],
    categoryList: [
      { id: 8, name: 'nostalgia' },
      { id: 9, name: 'relationship' },
    ],
    complianceList: [],
    complianceRating: '',
    contributionField: '',
    createdAt: new Date('2021-12-24T09:23:26.646Z'),
    defaultImage: true,
    defaultThumbnailIndex: 1,
    description:
      'Ya kahani se Sonu ki jo ek manchalya chhora se. Iss bin Maa ki chhori ki rukhal iska Babu Roshan karya kare. Roshan ka bs ek e sapna hai, Mera chhora padh-likhke khoob badiya number lyave. Isse khatar Roshan khave kamave se. Par Sonu ek bhayankar bimaari ka sikaar hojya se jisne kaya karein ISHQ. Ib Sonu Babu ka sapna pura kar pavega ya fer chhori ke sapne meh kuya ravega? Yo toh aapne puri web-series dekhe pache khud bera paat jyaga.',
    displayLanguage: Lang.EN,
    endDate: new Date('Tue Aug 02 2022 01:24:46 GMT+0300 (East Africa Time)'),
    episodeCount: 4,
    genreList: [{ id: 3, name: 'Drama' }],
    gradients: ['#f3d36d', '#4e2c11', '#c43614', '#faf8d1', '#ce8f28'],
    isComingSoon: false,
    label: 'new',
    language: 'har',
    mediaList: [
      {
        duration: 172,
        hlsSourceLink: 'diEOblOSWTrcejY7ri.m3u8',
        id: 910,
        mediaType: PeripheralMediaType.TRAILER,
        selectedPeripheralStatus: true,
        sourceLink: 'diEOblOSWTrcejY7ri.mp4',
        subtitle: { en: '', hin: '' },
        thumbnail: {
          horizontal: { sourceLink: 'showImage-1644651782793.jpg' },
          square: { sourceLink: '' },
          vertical: { sourceLink: '' },
        },
        title: 'Prem Nagar - Trailer',
        type: 'show-peripheral',
        viewCount: 0,
      },
      {
        duration: 44,
        hlsSourceLink: 'tKKZodPyDakkAfBNBx.m3u8',
        id: 681,
        mediaType: PeripheralMediaType.CLIP,
        selectedPeripheralStatus: false,
        sourceLink: 'tKKZodPyDakkAfBNBx.mp4',
        subtitle: { en: '', hin: '' },
        thumbnail: {
          horizontal: { sourceLink: 'showImage-1644651798746.jpg' },
          square: { sourceLink: '' },
          vertical: { sourceLink: '' },
        },
        title: 'Prem Nagar - Teaser',
        type: 'show-peripheral',
        viewCount: 0,
      },
    ],
    order: 1,
    preContentWarningText: '',
    selectedPeripheral: {
      duration: 172,
      hlsSourceLink: 'diEOblOSWTrcejY7ri.m3u8',
      sourceLink: 'diEOblOSWTrcejY7ri.mp4',
      thumbnail: {
        horizontal: { sourceLink: 'showImage-1644651782793.jpg' },
        square: { sourceLink: '' },
        vertical: { sourceLink: '' },
      },
      title: 'Prem Nagar - Trailer',
      type: 'show-peripheral',
      viewCount: 0,
    },
    showId: 309,
    showSlug: 'prem-nagar',
    slug: 'prem-nagar-season---1',
    startDate: new Date('Mon Feb 07 2022 15:00:05 GMT+0300 (East Africa Time)'),
    status: SeasonStatus.ACTIVE,
    subGenreList: [
      { id: 1053, name: 'Family Drama' },
      { id: 1051, name: 'Romantic Drama' },
      { id: 1054, name: 'Social Drama' },
    ],
    tags: 'Prem Nagar,Original',
    thumbnail: {
      horizontal: {
        ratio1: {
          gradient: '#f3d36d',
          sourceLink: 'showImage-1644651730319.jpg',
        },
        ratio2: { gradient: '', sourceLink: '' },
        ratio3: { gradient: '', sourceLink: '' },
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
    title: 'Season - 1',
    updatedAt: new Date('2024-11-14T07:13:15.096Z'),
    viewCount: 10,
  },
];
