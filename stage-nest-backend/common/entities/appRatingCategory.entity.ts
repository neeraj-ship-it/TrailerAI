import { Prop, Schema } from '@nestjs/mongoose';

import { Lang, Dialect } from '../enums/app.enum';
import { BaseModel } from './base.entity';

@Schema({ timestamps: true })
export class AppRatingCategory extends BaseModel {
  @Prop({ max: 30, min: 1, required: true, type: Number })
  categoryId!: number;

  @Prop({ required: true })
  categoryName!: string;

  @Prop({ enum: Dialect, required: true })
  dialect!: Dialect;

  @Prop({ enum: Lang, required: true })
  language!: Lang;
}
