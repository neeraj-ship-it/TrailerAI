import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';
import { Dialect, DialectStatus } from '@app/common/enums/app.enum';

@Schema({ collection: 'dialects', strict: true, timestamps: true })
export class Dialects extends BaseModel<number> {
  @Prop({ enum: Dialect, required: true, type: String })
  dialect!: Dialect;
  @Prop({ enum: Dialect, required: true, type: String })
  dialectAbbreviation!: Dialect;
  @Prop({ type: String })
  dialectEn!: string;
  @Prop({ type: String })
  dialectHin!: string;
  @Prop({ type: String })
  imageUrl!: string;
  @Prop({ enum: DialectStatus, required: true, type: String })
  status!: DialectStatus;
}
