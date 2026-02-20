import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserDeviceRecord } from '../entities/userDeviceRecord.entity';
import { BaseRepository } from './base.repository';
import { Errors } from '@app/error-handler';
import { LoginEnum } from 'common/enums/common.enums';
import { PopulatedUserDeviceRecord } from 'common/interfaces/user.interface';
import { DeviceDetailsDto } from 'src/users/dtos/user.dto';
@Injectable()
export class UserDeviceRecordRepository extends BaseRepository<UserDeviceRecord> {
  constructor(
    @InjectModel(UserDeviceRecord.name)
    private userDeviceRecord: Model<UserDeviceRecord>,
  ) {
    super(userDeviceRecord);
  }

  async checkUserDeviceRecord(deviceId: string): Promise<DeviceDetailsDto> {
    const result =
      await this.userDeviceRecord.findOne<PopulatedUserDeviceRecord>(
        { deviceId },
        ['_id', 'userId'],
        {
          populate: {
            path: 'userId',
            select: '_id countryCode primaryMobileNumber loginType',
          },
          sort: { latestLoginTime: -1 },
        },
      );

    if (
      !result?.userId?.countryCode ||
      !result?.userId?.primaryMobileNumber ||
      result?.userId?.loginType !== LoginEnum.MOBILE
    ) {
      throw Errors.DEVICE.DEVICE_NOT_FOUND();
    }

    return {
      countryCode: result?.userId?.countryCode,
      primaryMobileNumber: result?.userId?.primaryMobileNumber,
    };
  }
}
