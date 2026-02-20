import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserInternalRating } from '../entities/userInternalRating.entity';
import { BaseRepository } from './base.repository';

export class UserRatingRepository extends BaseRepository<UserInternalRating> {
  constructor(
    @InjectModel(UserInternalRating.name)
    private readonly userRatingModel: Model<UserInternalRating>,
  ) {
    super(userRatingModel);
  }

  async createOrUpdate(
    userId: string,
    data: Partial<UserInternalRating>,
  ): Promise<UserInternalRating> {
    return this.userRatingModel
      .findOneAndUpdate(
        { user_id: userId },
        { $set: data },
        { new: true, upsert: true },
      )
      .exec();
  }

  async findByUserId(userId: string): Promise<UserInternalRating | null> {
    return this.userRatingModel.findOne({ user_id: userId }).exec();
  }
}
