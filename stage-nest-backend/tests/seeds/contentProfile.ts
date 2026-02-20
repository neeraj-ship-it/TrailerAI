import { ContentType } from 'common/enums/common.enums';

import { userData } from './user';
import { Dialect } from 'common/enums/app.enum';
import { ObjectId } from 'mongodb';
import {
  ContentProfile,
  LikeStatusEnum,
} from 'src/content/entities/contentProfile.entity';

export const contentProfileData: Partial<ContentProfile>[] = [
  {
    _id: new ObjectId(userData[0]._id.toString()),
    createdAt: new Date(),
    likedContent: [
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'prem-nagar',
        status: LikeStatusEnum.DISLIKE,
      },
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'punarjanam',
        status: LikeStatusEnum.SUPERLIKE,
      },
    ],
    updatedAt: new Date(),
    watchListContent: [],
  },
  {
    _id: new ObjectId(userData[1]._id.toString()),
    createdAt: new Date(),
    likedContent: [
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'punarjanam',
        status: LikeStatusEnum.DISLIKE,
      },
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'mewat',
        status: LikeStatusEnum.SUPERLIKE,
      },
    ],
    updatedAt: new Date(),
    watchListContent: [],
  },
  {
    _id: new ObjectId(userData[2]._id.toString()),
    createdAt: new Date(),
    likedContent: [
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'prem-nagar',
        status: LikeStatusEnum.LIKE,
      },
      {
        contentType: ContentType.SHOW,
        dialect: Dialect.HAR,
        slug: 'choriyaan-bojh-na-hoti',
        status: LikeStatusEnum.SUPERLIKE,
      },
    ],
    updatedAt: new Date(),
    watchListContent: [],
  },
  {
    _id: new ObjectId('683ed3efa4acba353e3fd792'),
    createdAt: new Date(),
    likedContent: [],
    updatedAt: new Date(),
    watchListContent: [],
  },
];
