import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from '../../../common/entities/base.entity';

export enum OnboardingContentType {
  // EPISODE = 'episode',
  MOVIE = 'individual',
  SHOW = 'show',
}

export enum OnboardingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Schema({ collection: 'contentCategoryOnboardingMapping', timestamps: true })
export class ContentCategoryOnboardingMapping extends BaseModel {
  @Prop({ required: true, type: Number, unique: true })
  declare _id: number;

  @Prop({ required: true, type: [Number] })
  categoryIds!: number[]; // Array of category IDs

  @Prop({ required: false, type: [String] })
  cityAttributed?: string[];

  @Prop({ required: true, type: String })
  contentSlug!: string;

  @Prop({ enum: OnboardingContentType, required: true })
  contentType!: OnboardingContentType;

  @Prop({ required: true, type: String })
  overlay!: string;

  @Prop({ default: 1, required: true, type: Number })
  priorityOrder!: number;

  @Prop({
    default: OnboardingStatus.ACTIVE,
    enum: Object.values(OnboardingStatus),
    type: String,
  })
  status!: OnboardingStatus;
}
