import { Types } from 'mongoose';

import { userData } from './user';
import {
  ProfileStatus,
  Dialect,
  Lang,
  GenderEnum,
} from '@app/common/enums/app.enum';
import { UserProfile } from 'common/entities/userProfile.entity';

export const userProfileData: Partial<UserProfile>[] = [
  {
    // Primary profile - matches user ID
    _id: new Types.ObjectId(userData[0]._id),
    age: 25,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: userData[0].userName || 'har34134329',
    fullName: 'Primary Account',
    gender: GenderEnum.MALE,
    isPrimaryProfile: true,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId(userData[0]._id),
  },
  {
    // Secondary profile
    _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a2'),
    age: 29,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: 'mehra ji',
    fullName: 'manoj mehra',
    gender: GenderEnum.OTHER,
    isPrimaryProfile: false,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId(userData[0]._id),
  },
  {
    // Another active profile
    _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a4'),
    age: 150,
    avatar: 'har_default.png',
    contentCulture: Dialect.RAJ,
    displayName: 'Family Profile',
    fullName: 'Family Account',
    gender: GenderEnum.OTHER,
    isPrimaryProfile: false,
    language: Lang.HIN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId(userData[0]._id),
  },
  {
    // Deleted profile
    _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a3'),
    age: 25,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: 'Deleted Profile',
    fullName: 'Deleted Account',
    gender: GenderEnum.MALE,
    isPrimaryProfile: false,
    language: Lang.EN,
    status: ProfileStatus.DELETED,
    user: new Types.ObjectId(userData[0]._id),
  },
  // Profiles for userData[4] - dedicated for account invite tests
  {
    // Primary profile for account invite user
    _id: new Types.ObjectId('695b67720f4efa54ca7b7c50'), // matches userData[4]._id
    age: 30,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: 'AccountInviteUser',
    fullName: 'Account Invite Primary',
    gender: GenderEnum.MALE,
    isPrimaryProfile: true,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId('695b67720f4efa54ca7b7c50'),
  },
  {
    // Secondary profile for account invite user (used in existing device user test)
    _id: new Types.ObjectId('695b67720f4efa54ca7b7c51'),
    age: 25,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: 'Account Invite Profile 2',
    fullName: 'Account Invite Secondary',
    gender: GenderEnum.OTHER,
    isPrimaryProfile: false,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId('695b67720f4efa54ca7b7c50'),
  },
  {
    // Third profile for account invite user
    _id: new Types.ObjectId('695b67720f4efa54ca7b7c52'),
    age: 28,
    avatar: 'har_default.png',
    contentCulture: Dialect.HAR,
    displayName: 'Account Invite Profile 3',
    fullName: 'Account Invite Third',
    gender: GenderEnum.OTHER,
    isPrimaryProfile: false,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    user: new Types.ObjectId('695b67720f4efa54ca7b7c50'),
  },
];
