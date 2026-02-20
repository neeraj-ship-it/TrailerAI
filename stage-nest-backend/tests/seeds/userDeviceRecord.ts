import { Types } from 'mongoose';

import { userData } from './user';

// UserDeviceRecord seed data - links deviceId to userId
// This is used by the check-device endpoint
export const userDeviceRecordData = [
  {
    _id: new Types.ObjectId('690c3a87350d429831edebc1'),
    buildNumber: '100',
    deviceId: userData[0].deviceId, // 'device-123456'
    firstLoginTime: new Date(),
    latestLoginTime: new Date(),
    os: 'android',
    platform: 'app',
    userId: new Types.ObjectId(userData[0]._id),
  },
  {
    _id: new Types.ObjectId('690c3a87350d429831edebc2'),
    buildNumber: '101',
    deviceId: userData[1]?.deviceId || 'device-654321',
    firstLoginTime: new Date(),
    latestLoginTime: new Date(),
    os: 'ios',
    platform: 'app',
    userId: new Types.ObjectId(userData[1]?._id || userData[0]._id),
  },
];
