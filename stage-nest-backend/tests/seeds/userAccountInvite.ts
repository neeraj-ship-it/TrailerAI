import { Types } from 'mongoose';

import { userData } from './user';
import { UserAccountInvite } from '@app/common/entities/userAccountInvite.entity';
import { Dialect, Lang, ProfileStatus } from '@app/common/enums/app.enum';

// Dedicated profile ID for account invite tests (belongs to userData[4])
const accountInviteProfileId = new Types.ObjectId('695b67720f4efa54ca7b7c51');

export const userAccountInviteData: Partial<UserAccountInvite>[] = [
  {
    // Active invite without profile linked (new device user scenario) - for userData[4]
    _id: new Types.ObjectId('6f7c6b5e1c9d440000a1c1a1'),
    dialect: Dialect.HAR,
    language: Lang.EN,
    status: ProfileStatus.ACTIVE,
    userDeviceId: 'device-owner-123',
    userId: new Types.ObjectId('695b67720f4efa54ca7b7c50'), // userData[4]
  },
  {
    // Active invite with profile linked (existing device user scenario) - for userData[4]
    _id: new Types.ObjectId('6f7c6b5e1c9d440000a1c1a2'),
    dialect: Dialect.HAR,
    language: Lang.EN,
    profileDeviceId: 'profile-device-456',
    profileId: accountInviteProfileId,
    status: ProfileStatus.ACTIVE,
    userDeviceId: 'device-owner-456',
    userId: new Types.ObjectId('695b67720f4efa54ca7b7c50'), // userData[4]
  },
  {
    // Invite for different user (userData[1]) - used for "no invites" test
    _id: new Types.ObjectId('6f7c6b5e1c9d440000a1c1a3'),
    dialect: Dialect.RAJ,
    language: Lang.HIN,
    status: ProfileStatus.ACTIVE,
    userDeviceId: 'device-owner-789',
    userId: new Types.ObjectId(userData[1]._id),
  },
];
