import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Role } from '../entities/role.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {
    super(roleModel);
  }
}
