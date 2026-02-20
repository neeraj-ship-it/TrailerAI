import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { CurrencyEnum } from '../enums/app.enum';
import {
  OrderStatusEnum,
  OrderStatusHistoryEventEnum,
  PaymentModeEnum,
} from '../enums/common.enums';
import { BaseModel } from './base.entity';
import { Plan } from './plan.entity';
import { User } from './user.entity';

@Schema({ _id: false })
export class OrderStatusHistoryItem {
  @Prop({
    default: OrderStatusHistoryEventEnum.DEFAULT,
    enum: OrderStatusHistoryEventEnum,
    type: String,
  })
  event!: OrderStatusHistoryEventEnum;

  @Prop({
    default: { message: 'none' },
    required: true,
    type: Object,
  })
  info!: {
    message: string;
    idForTheAboveRecurringPaymentOrder?: string;
  };

  @Prop({ ref: Plan.name, required: true, type: Types.ObjectId })
  plan!: Types.ObjectId;

  @Prop({ enum: OrderStatusEnum, required: true, type: String })
  status!: OrderStatusEnum;

  @Prop({ required: true, type: Date })
  time!: Date;
}

@Schema({ collection: 'orders', timestamps: true })
export class Orders extends BaseModel {
  @Prop({ required: true, type: Number })
  amount!: number;

  @Prop({ default: null, ref: 'coupons', required: true, type: Types.ObjectId })
  coupon!: Types.ObjectId | null;

  @Prop({ default: 'none', required: true, type: String })
  couponName!: string;

  @Prop({
    default: CurrencyEnum.INR,
    enum: CurrencyEnum,
    required: true,
    type: String,
  })
  currency!: CurrencyEnum;

  @Prop({ required: true, type: Boolean })
  isAuthenticationTransactionOrder!: boolean;

  @Prop({ default: true, required: true, type: Boolean })
  isRecurring!: boolean;

  @Prop({
    default: PaymentModeEnum.UPI,
    enum: PaymentModeEnum,
    required: true,
    type: String,
  })
  method!: PaymentModeEnum;

  @Prop({ enum: OrderStatusEnum, required: true, type: String })
  orderStatus!: OrderStatusEnum;

  @Prop({ required: true, type: [OrderStatusHistoryItem] })
  orderStatusHistory!: OrderStatusHistoryItem[];

  @Prop({ default: 0, required: true, type: Number })
  orderUpdateCount!: number;

  @Prop({ ref: Plan.name, required: true, type: Types.ObjectId })
  plan!: Types.ObjectId;

  @Prop({ required: true, type: String })
  planId!: string;

  @Prop({ required: true, type: Number })
  planPrice!: number;

  @Prop({
    required: true,
    type: {
      _id: { type: Types.ObjectId },
      customerId: { required: true, type: String },
      orderId: { required: true, type: String },
      paymentId: { type: String },
    },
  })
  razorpay!: {
    _id?: Types.ObjectId;
    customerId: string;
    orderId: string;
    paymentId?: string;
  };

  @Prop({ type: Number })
  retryTriggerCount?: number;

  @Prop({ required: true, type: Date })
  scheduledOrderDate!: Date;

  @Prop({ required: true, type: Date })
  scheduledPaymentTriggerDate!: Date;

  @Prop({ ref: User.name, required: true, type: Types.ObjectId })
  user!: Types.ObjectId;

  @Prop({ default: false, type: Boolean })
  withGst?: boolean;

  @Prop({ type: String })
  xRazorpayEventId?: string;
}
