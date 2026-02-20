import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';

import { UserContentStates } from '../entities/userSpecialAccess.entity';
import { ContentFormat } from '@app/common/entities/contents.entity';
import { Dialect } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { StateCategory } from '@app/common/schema/specialAccess.schema';

@Injectable()
export class UserSpecialStatesRepository extends BaseRepository<UserContentStates> {
  constructor(
    @InjectModel(UserContentStates.name)
    private readonly userSpecialStatesModel: Model<UserContentStates>,
  ) {
    super(userSpecialStatesModel);
  }

  async addStateToUser(
    userId: string,
    stateItem: {
      content_dialect: Dialect;
      content_format: ContentFormat;
      content_type: ContentType;
      episode_slug: string;
      show_slug: string;
      state_category: StateCategory;
      state_value: number;
      content_id: number;
    },
  ): Promise<UserContentStates> {
    const now = new Date();
    const stateItemWithTimestamps = {
      ...stateItem,
      created_at: now,
      updated_at: now,
    };

    return this.userSpecialStatesModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          $push: { states: stateItemWithTimestamps },
        },
        { new: true, upsert: true },
      )
      .exec() as Promise<UserContentStates>;
  }

  async createFreeMicrodrama(userId: string, show_slug: string) {
    return await this.userSpecialStatesModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          $setOnInsert: {
            free_microdrama: { show_slug },
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();
  }

  async deleteUserSpecialAccessStates(userId: string): Promise<boolean> {
    const result = await this.userSpecialStatesModel
      .deleteOne({ _id: new Types.ObjectId(userId) })
      .exec();
    return result.deletedCount > 0;
  }

  async updateFirstState(
    userId: string,
    updateData: {
      state_category: string;
      state_value: number;
      updated_at: Date;
    },
  ): Promise<UserContentStates | null> {
    return this.userSpecialStatesModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          $set: {
            'states.0.state_category': updateData.state_category,
            'states.0.state_value': updateData.state_value,
            'states.0.updated_at': updateData.updated_at,
          },
        },
        { new: true },
      )
      .exec();
  }

  async updateFreeMicrodramaState(userId: string) {
    const updatedState = await this.userSpecialStatesModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        { $set: { 'free_microdrama.banner_shown': true } },
        { new: true },
      )
      .lean()
      .exec();

    return updatedState?.free_microdrama;
  }
}
