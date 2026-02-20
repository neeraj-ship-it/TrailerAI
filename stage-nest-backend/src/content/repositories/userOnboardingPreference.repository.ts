import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  UserOnboardingPreference,
  OnboardingAction,
  CategorySwipe,
} from '../entities/userOnboardingPreference.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class UserOnboardingPreferenceRepository extends BaseRepository<UserOnboardingPreference> {
  constructor(
    @InjectModel(UserOnboardingPreference.name)
    private readonly userOnboardingPreferenceModel: Model<UserOnboardingPreference>,
  ) {
    super(userOnboardingPreferenceModel);
  }

  async createOrUpdate(
    userId: string,
    profileId: string,
    categorySwipe: CategorySwipe,
  ): Promise<UserOnboardingPreference> {
    const filter = {
      profile: new Types.ObjectId(profileId),
      user: new Types.ObjectId(userId),
    };

    // Check if category already swiped
    const existingPreference = await this.userOnboardingPreferenceModel
      .findOne({
        ...filter,
        'categorySwipes.categoryId': categorySwipe.categoryId,
      })
      .exec();

    if (existingPreference) {
      // Update existing swipe - totalSwipes stays same since it's the same category
      const updatedDoc = await this.userOnboardingPreferenceModel
        .findOneAndUpdate(
          {
            ...filter,
            'categorySwipes.categoryId': categorySwipe.categoryId,
          },
          {
            $set: {
              'categorySwipes.$.action': categorySwipe.action,
              'categorySwipes.$.swipedAt': categorySwipe.swipedAt,
              lastSwipeAt: new Date(),
              totalSwipes: existingPreference.categorySwipes.length, // Ensure totalSwipes matches unique categories
            },
          },
          { new: true, upsert: true },
        )
        .exec();

      return updatedDoc as UserOnboardingPreference;
    } else {
      // Add new swipe
      const existingDoc = await this.userOnboardingPreferenceModel
        .findOne(filter)
        .exec();

      const swipeOrder = existingDoc?.categorySwipes.length || 0;
      const newTotalSwipes = (existingDoc?.categorySwipes.length || 0) + 1;

      categorySwipe.swipeOrder = swipeOrder;

      return this.userOnboardingPreferenceModel
        .findOneAndUpdate(
          filter,
          {
            $addToSet: {
              [categorySwipe.action === OnboardingAction.LIKE
                ? 'likedCategoryIds'
                : 'dislikedCategoryIds']: categorySwipe.categoryId,
            },
            $push: { categorySwipes: categorySwipe },
            $set: {
              lastSwipeAt: new Date(),
              totalSwipes: newTotalSwipes, // Set totalSwipes to match unique categories count
            },
          },
          { new: true, upsert: true },
        )
        .exec() as Promise<UserOnboardingPreference>;
    }
  }

  async deleteUserOnboardingPreference(userId: string): Promise<void> {
    await this.userOnboardingPreferenceModel
      .deleteMany({
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async deleteUserPreferences(
    userId: string,
    profileId: string,
  ): Promise<void> {
    await this.userOnboardingPreferenceModel
      .deleteOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByProfileId(
    profileId: string,
  ): Promise<UserOnboardingPreference | null> {
    return this.userOnboardingPreferenceModel
      .findOne({ profile: new Types.ObjectId(profileId) })
      .exec();
  }

  async findByUserId(userId: string): Promise<UserOnboardingPreference | null> {
    return this.userOnboardingPreferenceModel
      .findOne({ user: new Types.ObjectId(userId) })
      .exec();
  }

  async getCategorySwipeHistory(
    userId: string,
    profileId: string,
    limit?: number,
  ): Promise<CategorySwipe[]> {
    const preference = await this.userOnboardingPreferenceModel
      .findOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .select('categorySwipes')
      .exec();

    if (!preference) return [];

    let swipes = preference.categorySwipes.sort(
      (a, b) => a.swipeOrder - b.swipeOrder,
    );

    if (limit) {
      swipes = swipes.slice(0, limit);
    }

    return swipes;
  }

  async getUserLikedCategoryIds(
    userId: string,
    profileId: string,
  ): Promise<number[]> {
    const preference = await this.userOnboardingPreferenceModel
      .findOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .select('likedCategoryIds')
      .exec();

    return preference?.likedCategoryIds || [];
  }

  async getUserSwipeCount(userId: string, profileId: string): Promise<number> {
    const preference = await this.userOnboardingPreferenceModel
      .findOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .select('totalSwipes')
      .exec();

    return preference?.totalSwipes || 0;
  }

  async hasUserSwipedAnyCard(
    userId: string,
    profileId: string,
  ): Promise<boolean> {
    const count = await this.userOnboardingPreferenceModel
      .countDocuments({
        profile: new Types.ObjectId(profileId),
        totalSwipes: { $gt: 0 },
        user: new Types.ObjectId(userId),
      })
      .exec();

    return count > 0;
  }

  async markOnboardingComplete(
    userId: string,
    profileId: string,
  ): Promise<UserOnboardingPreference | null> {
    return this.userOnboardingPreferenceModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          isOnboardingComplete: true,
          onboardingCompletedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async updateDislikedCategories(
    userId: string,
    profileId: string,
    categoryIds: number[],
  ): Promise<UserOnboardingPreference | null> {
    return this.userOnboardingPreferenceModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          $addToSet: {
            dislikedCategoryIds: { $each: categoryIds },
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  async updateLikedCategories(
    userId: string,
    profileId: string,
    categoryIds: number[],
  ): Promise<UserOnboardingPreference | null> {
    return this.userOnboardingPreferenceModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          $addToSet: {
            likedCategoryIds: { $each: categoryIds },
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }
}
