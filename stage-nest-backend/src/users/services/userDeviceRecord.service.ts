import { Injectable, Inject } from '@nestjs/common';

import { UserDeviceRecordRepository } from 'common/repositories/userDeviceRecord.repository';

@Injectable()
export class UserDeviceRecordService {
  constructor(
    @Inject() private userDeviceRecordRepository: UserDeviceRecordRepository,
  ) {}

  async checkUserDeviceRecord(deviceId: string) {
    return await this.userDeviceRecordRepository.checkUserDeviceRecord(
      deviceId,
    );
  }
}
