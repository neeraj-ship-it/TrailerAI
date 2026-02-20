import { User } from 'common/entities/user.entity';
import { UserDeviceRecord } from 'common/entities/userDeviceRecord.entity';

export interface UpdateUserCulture {
  initialUserCulture: string;
  userCulture: string;
}

export interface DeviceUserDetails {
  countryCode: string;
  loginType: string;
  primaryMobileNumber: string;
}

export interface PopulatedUserDeviceRecord
  extends Omit<UserDeviceRecord, 'userId'> {
  userId: Pick<User, 'countryCode' | 'primaryMobileNumber' | 'loginType'>;
}
