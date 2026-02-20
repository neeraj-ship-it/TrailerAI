import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';

@Schema({
  strict: true,
  timestamps: true,
})
export class RecurringTransaction extends BaseModel {
  @Prop({ type: String })
  orderId?: string;

  @Prop({ required: true, type: String })
  pgTxnId!: string;

  @Prop({ type: String })
  referenceId?: string;
}
