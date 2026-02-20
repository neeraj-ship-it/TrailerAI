import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserAccountInvite } from '../entities/userAccountInvite.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserAccountInviteRepository extends BaseRepository<UserAccountInvite> {
  constructor(
    @InjectModel(UserAccountInvite.name)
    private userAccountInviteModel: Model<UserAccountInvite>,
  ) {
    super(userAccountInviteModel);
  }
}
