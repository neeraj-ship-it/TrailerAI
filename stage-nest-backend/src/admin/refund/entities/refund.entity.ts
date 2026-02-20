import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { RefundedByEnum } from '../enums/refundedBy.enum';

import { RecurringRefundStatus } from '@app/common/enums/common.enums';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { BaseModel } from 'common/entities/base.entity';

@Schema({ timestamps: true, versionKey: false })
export class Refund extends BaseModel {
  @Prop({
    default: null,
    ref: 'JuspayOrder',
    type: Types.ObjectId,
  })
  juspayOrder?: Types.ObjectId;

  @Prop({
    default: null,
    ref: 'MasterMandate',
    required: false,
    type: Types.ObjectId,
  })
  masterMandateId?: Types.ObjectId;

  @Prop({ required: true })
  pgTransactionId!: string;

  @Prop({ required: false, type: String })
  reason!: string;

  @Prop({ required: true })
  refundAmount!: number;

  @Prop({ enum: RefundedByEnum, required: true })
  refundedBy!: string;

  @Prop({
    ref: 'AdminUser',
    required: false,
    type: Types.ObjectId,
  })
  refundInitiatedBy!: Types.ObjectId;

  @Prop({ required: false, type: String })
  refundInitiatedByUserName!: string;

  @Prop({ enum: RecurringRefundStatus, required: true })
  refundStatus!: string;

  @Prop([
    {
      refundStatus: { type: String },
      time: { type: Date },
    },
  ])
  refundStatusHistory!: { refundStatus: string; time: Date }[];

  @Prop({ required: true })
  refundTransactionId!: string;

  @Prop({ ref: 'UserSubscriptionHistory', required: true })
  subscriptionId!: string;

  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  user!: Types.ObjectId;

  @Prop({ enum: PaymentGatewayEnum, required: true, type: String })
  vendor!: PaymentGatewayEnum;
}
