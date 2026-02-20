import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AdminUser } from '../entities/adminUser.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class AdminUserRepository extends BaseRepository<AdminUser> {
  constructor(
    @InjectModel(AdminUser.name) private adminUserModel: Model<AdminUser>,
  ) {
    super(adminUserModel);
  }
}
