import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '../../../common/entities/base.entity';
import { OnboardingContentType } from './contentCategoryOnboardingMapping.entity';

export enum OnboardingFlowState {
  CONTENT_DISCOVERY_COMPLETED = 'content_discovery_completed',
  CONTENT_DISCOVERY_IN_PROGRESS = 'content_discovery_in_progress',
  CONTENT_DISCOVERY_PENDING = 'content_discovery_pending',
  NOT_STARTED = 'not_started',
  ONBOARDING_COMPLETED = 'onboarding_completed',
}

export enum ContentConsumptionState {
  NOT_VIEWED = 'not_viewed',
  VIEWED_20_TO_40 = 'viewed_20_to_40',
  VIEWED_40_TO_90 = 'viewed_40_to_90',
  VIEWED_LESS_THAN_20 = 'viewed_less_than_20',
  VIEWED_MORE_THAN_90 = 'viewed_more_than_90',
}

export enum RewardType {
  ACTIVE_4_DAYS = 'active_4_days',
  CONSUMPTION_40_PERCENT = 'consumption_40_percent',
  CONSUMPTION_90_PERCENT = 'consumption_90_percent',
  // FIRST_DOWNLOAD_ITEM = 'first_download_item',
  FIRST_WATCHLIST_ITEM = 'first_watchlist_item',
  WATCHED_1_COMPLETE_CONTENT = 'watched_1_complete_content',
  WATCHED_2_COMPLETE_CONTENT = 'watched_2_complete_content',
}

export enum RankingMilestone {
  FIRST_40_PERCENT = 'first_40_percent',
  FIRST_90_PERCENT = 'first_90_percent',
  FIRST_SWIPE = 'first_swipe',
  FOUR_DAYS_ACTIVE = 'four_days_active',
  WATCHED_1_COMPLETE_CONTENT = 'watched_1_complete_content',
  WATCHED_2_COMPLETE_CONTENT = 'watched_2_complete_content',
}

export enum FlashCardsState {
  FLASH_CARDS_COMPLETED = 'flash_cards_completed',
  FLASH_CARDS_IN_PROGRESS = 'flash_cards_in_progress',
  FLASH_CARDS_PENDING = 'flash_cards_pending',
}

@Schema({ _id: false })
export class ContentProgress {
  @Prop({
    default: ContentConsumptionState.NOT_VIEWED,
    enum: ContentConsumptionState,
  })
  consumptionState!: ContentConsumptionState;

  @Prop({ required: true, type: Number })
  contentId!: number;

  @Prop({ enum: OnboardingContentType, required: true })
  contentType!: OnboardingContentType;

  @Prop({ default: false, type: Boolean })
  isCompleted!: boolean;

  @Prop({ type: Date })
  lastWatchedAt?: Date;

  @Prop({ required: true, type: String })
  slug!: string;

  @Prop({ default: 0, type: Number })
  watchedPercentage!: number;
}

@Schema({ _id: false })
export class UserReward {
  @Prop({ default: Date.now, required: true, type: Date })
  achievedAt!: Date;

  @Prop({ type: String })
  description?: string;

  @Prop({ default: false, type: Boolean })
  isCollected!: boolean;

  @Prop({ enum: RewardType, required: true })
  type!: RewardType;
}

@Schema({ timestamps: true })
export class UserOnboardingState extends BaseModel {
  @Prop({ default: [], type: [Date] })
  activeDatesHistory!: Date[];

  @Prop({ default: 0, type: Number })
  activeDays!: number;

  @Prop({ default: 0, type: Number })
  cardsSwiped!: number;

  // Content Discovery State
  @Prop({ default: [], type: [ContentProgress] })
  contentProgress!: ContentProgress[];

  @Prop({ default: 0, type: Number })
  currentCardIndex!: number;

  // Ranking System
  @Prop({ required: true, type: Number })
  currentRank!: number;

  @Prop({
    default: OnboardingFlowState.NOT_STARTED,
    enum: [OnboardingFlowState, FlashCardsState],
  })
  currentState!: OnboardingFlowState | FlashCardsState;

  @Prop({ default: false, type: Boolean })
  hasAllMedals!: boolean;

  @Prop({ default: false, type: Boolean })
  hasAllThreeMedals!: boolean;

  @Prop({ default: false, type: Boolean })
  hasCompletedRanking!: boolean;

  @Prop({ default: false, type: Boolean })
  hasSwipedAllCards!: boolean;

  // Flash Cards State
  @Prop({ default: false, type: Boolean })
  hasSwipedAnyCard!: boolean;

  @Prop({ default: false, type: Boolean })
  hasViewedAnyContent!: boolean;

  @Prop({ type: Date })
  lastContentViewAt?: Date;

  @Prop({ type: String })
  lastViewedContentSlug?: string;

  @Prop({ ref: 'UserProfile', required: true, type: Types.ObjectId })
  profile!: Types.ObjectId;

  @Prop({ default: 0, type: Number })
  progressPercentage!: number;

  // Rewards State
  @Prop({ default: [], type: [UserReward] })
  rewards!: UserReward[];

  @Prop({ type: Date })
  stateUpdatedAt?: Date;

  @Prop({ default: 0, type: Number })
  totalCardsAvailable!: number;

  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  user!: Types.ObjectId;
}
