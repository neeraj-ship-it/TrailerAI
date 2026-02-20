import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';

@Schema({ timestamps: true })
export class UserInternalRating extends BaseModel {
  @Prop({ type: [Number] })
  issue_category_ids?: number[];

  @Prop({ max: 5, min: 1, required: true })
  rating!: number;

  @Prop({ maxlength: 1000 })
  review_text?: string;

  @Prop({ required: true, unique: true })
  user_id!: string;
}
