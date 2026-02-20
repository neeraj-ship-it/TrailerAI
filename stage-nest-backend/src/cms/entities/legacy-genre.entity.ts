import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

@Schema({ collection: 'genres', timestamps: true })
export class LegacyGenre extends BaseModel {
  @Prop({ required: false, type: Object })
  bho?: {
    bannerEn: string;
    bannerHin: string;
    en: string;
    hin: string;
  };

  @Prop({ required: true })
  description!: string;

  @Prop({ default: [], type: [String] })
  dialect!: string[];

  @Prop({ required: false, type: Object })
  har?: {
    bannerEn: string;
    bannerHin: string;
    en: string;
    hin: string;
  };

  @Prop({ required: true })
  hindiName!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ default: false })
  isUsed!: boolean;

  @Prop({ required: true })
  metaDescription!: string;

  @Prop({ required: true })
  metaKeyword!: string;

  @Prop({ required: true })
  metaTitle!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: false, type: Object })
  raj?: {
    bannerEn: string;
    bannerHin: string;
    en: string;
    hin: string;
  };

  @Prop({ required: true })
  slug!: string;

  @Prop({ required: true })
  sortOrder!: number;

  @Prop({ required: true })
  status!: string;
}
