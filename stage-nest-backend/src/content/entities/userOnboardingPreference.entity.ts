import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '../../../common/entities/base.entity';

export enum OnboardingAction {
  DISLIKE = 'DISLIKE', // Dislike
  LIKE = 'LIKE', // Like
}

@Schema({ _id: false })
export class CategorySwipe {
  @Prop({ enum: OnboardingAction, required: true })
  action!: OnboardingAction;

  @Prop({ required: true, type: Number })
  categoryId!: number;

  @Prop({ required: true, type: String })
  categoryName!: string;

  @Prop({ default: Date.now, required: true, type: Date })
  swipedAt!: Date;

  @Prop({ default: 0, type: Number })
  swipeOrder!: number;
}

@Schema({ timestamps: true })
export class UserOnboardingPreference extends BaseModel {
  @Prop({ default: [], type: [CategorySwipe] })
  categorySwipes!: CategorySwipe[];

  @Prop({ default: [], type: [Number] })
  dislikedCategoryIds!: number[];

  @Prop({ default: false, type: Boolean })
  isOnboardingComplete!: boolean;

  @Prop({ type: Date })
  lastSwipeAt?: Date;

  @Prop({ default: [], type: [Number] })
  likedCategoryIds!: number[];

  @Prop({ type: Date })
  onboardingCompletedAt?: Date;

  @Prop({ ref: 'UserProfile', required: true, type: Types.ObjectId })
  profile!: Types.ObjectId;

  @Prop({ default: 0, type: Number })
  totalSwipes!: number;

  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  user!: Types.ObjectId;
}
