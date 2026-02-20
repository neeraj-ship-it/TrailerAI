import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from '../../../common/entities/base.entity';
import { LanguageVariantProperty } from 'common/schema/localizedString.schema';

export enum CategoryStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  INACTIVE = 'inactive',
}

@Schema({ collection: 'contentOnboardingCategory', timestamps: true })
export class ContentOnboardingCategory extends BaseModel {
  @Prop({ required: true, type: Number, unique: true })
  declare _id: number;

  @Prop({ required: true, type: LanguageVariantProperty })
  categoryDescription!: LanguageVariantProperty;

  @Prop({ type: String })
  categoryIcon?: string;

  @Prop({ required: true, type: LanguageVariantProperty })
  categoryName!: LanguageVariantProperty;

  @Prop({ required: true, type: LanguageVariantProperty })
  categoryThumbnail!: LanguageVariantProperty;

  @Prop({ type: String })
  color?: string; // For UI theming

  @Prop({ type: String })
  dialect?: string; // Dialect for category filtering

  @Prop({ default: 1, required: true, type: Number })
  displayOrder!: number;

  @Prop({
    default: CategoryStatus.ACTIVE,
    enum: Object.values(CategoryStatus),
    type: String,
  })
  status!: CategoryStatus;

  @Prop({ default: [], type: [String] })
  tags?: string[]; // Additional categorization tags
}
