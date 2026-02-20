import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  UserOnboardingState,
  OnboardingFlowState,
  ContentProgress,
  UserReward,
  RewardType,
  FlashCardsState,
} from '../entities/userOnboardingState.entity';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class UserOnboardingStateRepository extends BaseRepository<UserOnboardingState> {
  constructor(
    @InjectModel(UserOnboardingState.name)
    private readonly userOnboardingStateModel: Model<UserOnboardingState>,
  ) {
    super(userOnboardingStateModel);
  }

  async addReward(
    userId: string,
    profileId: string,
    reward: UserReward,
  ): Promise<UserOnboardingState | null> {
    // Check if reward already exists
    const existingState = await this.userOnboardingStateModel
      .findOne({
        profile: new Types.ObjectId(profileId),
        'rewards.type': reward.type,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (existingState) {
      return existingState; // Reward already exists
    }

    const state = await this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          $push: { rewards: reward },
          stateUpdatedAt: new Date(),
        },
        { new: true, upsert: true },
      )
      .exec();

    // Check if user now has all 4 medals
    if (
      state &&
      state.rewards.length >=
        APP_CONFIGS.CONTENT_ONBOARDING.ONBOARDING_JOURNEY_COMPLETE_MEDALS_COUNT
    ) {
      await this.userOnboardingStateModel
        .findByIdAndUpdate(state._id, {
          hasAllMedals: true,
          hasAllThreeMedals: true,
        })
        .exec();
    }

    return state;
  }

  async collectReward(
    userId: string,
    profileId: string,
    rewardType: RewardType,
  ): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          'rewards.type': rewardType,
          user: new Types.ObjectId(userId),
        },
        {
          $set: { 'rewards.$.isCollected': true },
          stateUpdatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async createOrUpdate(
    userId: string,
    profileId: string,
    initialState: Partial<UserOnboardingState> = {},
  ): Promise<UserOnboardingState> {
    const filter = {
      profile: new Types.ObjectId(profileId),
      user: new Types.ObjectId(userId),
    };

    const update = {
      ...initialState,
      stateUpdatedAt: new Date(),
    };

    return this.userOnboardingStateModel
      .findOneAndUpdate(filter, update, { new: true, upsert: true })
      .exec() as Promise<UserOnboardingState>;
  }

  async deleteUserOnboardingState(userId: string): Promise<void> {
    await this.userOnboardingStateModel
      .deleteMany({
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async deleteUserState(userId: string, profileId: string): Promise<void> {
    await this.userOnboardingStateModel
      .deleteOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByProfileId(
    profileId: string,
  ): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOne({ profile: new Types.ObjectId(profileId) })
      .exec();
  }

  async findByUserId(userId: string): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOne({ user: new Types.ObjectId(userId) })
      .exec();
  }

  async getContentProgress(
    userId: string,
    profileId: string,
    contentId: number,
  ): Promise<ContentProgress | null> {
    const state = await this.userOnboardingStateModel
      .findOne({
        'contentProgress.contentId': contentId,
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .select('contentProgress.$')
      .exec();

    return state?.contentProgress?.[0] || null;
  }

  async getOnboardingStats(): Promise<{
    totalUsers: number;
    stateDistribution: { state: OnboardingFlowState; count: number }[];
    averageActiveDays: number;
    rewardDistribution: { type: RewardType; count: number }[];
  }> {
    const [totalUsers, stateDistribution, avgActiveDays, rewardDistribution] =
      await Promise.all([
        this.userOnboardingStateModel.countDocuments().exec(),

        this.userOnboardingStateModel
          .aggregate([
            { $group: { _id: '$currentState', count: { $sum: 1 } } },
            { $project: { _id: 0, count: 1, state: '$_id' } },
          ])
          .exec(),

        this.userOnboardingStateModel
          .aggregate([{ $group: { _id: null, avg: { $avg: '$activeDays' } } }])
          .exec(),

        this.userOnboardingStateModel
          .aggregate([
            { $unwind: '$rewards' },
            { $group: { _id: '$rewards.type', count: { $sum: 1 } } },
            { $project: { _id: 0, count: 1, type: '$_id' } },
          ])
          .exec(),
      ]);

    return {
      averageActiveDays: avgActiveDays[0]?.avg || 0,
      rewardDistribution,
      stateDistribution,
      totalUsers,
    };
  }

  async getUserRewards(
    userId: string,
    profileId: string,
  ): Promise<UserReward[]> {
    const state = await this.userOnboardingStateModel
      .findOne({
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      })
      .select('rewards')
      .exec();

    return state?.rewards || [];
  }

  async getUsersInState(
    state: OnboardingFlowState,
  ): Promise<UserOnboardingState[]> {
    return this.userOnboardingStateModel.find({ currentState: state }).exec();
  }

  async updateActiveDays(
    userId: string,
    profileId: string,
  ): Promise<UserOnboardingState | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is already counted
    const state = await this.userOnboardingStateModel.findOne({
      activeDatesHistory: { $gte: today },
      profile: new Types.ObjectId(profileId),
      user: new Types.ObjectId(userId),
    });

    if (state) {
      return state; // Already counted for today
    }

    // Add today and increment active days
    const updatedState = await this.userOnboardingStateModel.findOneAndUpdate(
      {
        profile: new Types.ObjectId(profileId),
        user: new Types.ObjectId(userId),
      },
      {
        $addToSet: { activeDatesHistory: today },
        $inc: { activeDays: 1 },
        stateUpdatedAt: new Date(),
      },
      { new: true, upsert: true },
    );

    // Check if user has reached 4 active days for reward
    if (updatedState && updatedState.activeDays >= 4) {
      await this.addReward(userId, profileId, {
        achievedAt: new Date(),
        description: 'Achieved 4 active days!',
        isCollected: false,
        type: RewardType.ACTIVE_4_DAYS,
      });
    }

    return updatedState;
  }

  async updateContentProgress(
    userId: string,
    profileId: string,
    progress: ContentProgress,
  ): Promise<UserOnboardingState | null> {
    // First, try to update existing content progress
    const updatedDoc = await this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          'contentProgress.contentType': progress.contentType,
          'contentProgress.slug': progress.slug,
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          $set: {
            'contentProgress.$.consumptionState': progress.consumptionState,
            'contentProgress.$.isCompleted': progress.isCompleted,
            'contentProgress.$.lastWatchedAt': progress.lastWatchedAt,
            'contentProgress.$.watchedPercentage': progress.watchedPercentage,
            hasViewedAnyContent: true,
            lastContentViewAt: new Date(),
            lastViewedContentSlug: progress.slug,
            stateUpdatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (updatedDoc) {
      return updatedDoc;
    }

    // If not found, add new content progress
    return this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          $push: { contentProgress: progress },
          $set: {
            hasViewedAnyContent: true,
            lastContentViewAt: new Date(),
            lastViewedContentSlug: progress.slug,
            stateUpdatedAt: new Date(),
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  async updateFlashCardState(
    userId: string,
    profileId: string,
    cardState: {
      hasSwipedAnyCard?: boolean;
      hasSwipedAllCards?: boolean;
      totalCardsAvailable?: number;
      cardsSwiped?: number;
      currentCardIndex?: number;
    },
  ): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          ...cardState,
          stateUpdatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async updateFlowState(
    userId: string,
    profileId: string,
    newState: OnboardingFlowState | FlashCardsState,
  ): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          currentState: newState,
          stateUpdatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async updateRank(
    userId: string,
    profileId: string,
    rankData: {
      currentRank?: number;
      progressPercentage?: number;
      hasCompletedRanking?: boolean;
    },
  ): Promise<UserOnboardingState | null> {
    return this.userOnboardingStateModel
      .findOneAndUpdate(
        {
          profile: new Types.ObjectId(profileId),
          user: new Types.ObjectId(userId),
        },
        {
          ...rankData,
          stateUpdatedAt: new Date(),
        },
        { new: true, upsert: true },
      )
      .exec();
  }
}
