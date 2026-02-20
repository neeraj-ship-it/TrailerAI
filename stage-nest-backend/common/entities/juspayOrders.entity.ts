import { Prop, Schema } from '@nestjs/mongoose';

import { Types } from 'mongoose';

import { JuspayOrderStatusEnum } from '../enums/common.enums';
import { BaseModel } from './base.entity';
import { Plan } from './plan.entity';
import { User } from './user.entity';

@Schema({ _id: false })
class RefundStatus {
  @Prop({
    required: true,
    type: String,
  })
  status!: string;

  @Prop({
    required: true,
    type: Date,
  })
  time!: Date;
}

@Schema({ collection: 'juspayorders', timestamps: true })
export class JuspayOrder extends BaseModel {
  @Prop({ enum: JuspayOrderStatusEnum, type: String })
  orderStatus!: JuspayOrderStatusEnum;

  @Prop({ type: Types.ObjectId })
  parentOrder?: Types.ObjectId;

  @Prop({ ref: Plan.name, type: Types.ObjectId })
  plan!: Types.ObjectId;

  @Prop({ type: String })
  planId!: string;

  @Prop({ default: 'none', type: String })
  refundStatus!: string;

  @Prop({ type: [RefundStatus] })
  refundStatusHistory?: RefundStatus[];

  @Prop({ ref: User.name, required: true, type: Types.ObjectId }) // FIXME: Refactor to use User entity after migration
  user!: Types.ObjectId;
}
