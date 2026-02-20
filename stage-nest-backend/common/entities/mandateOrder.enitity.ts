import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ClientAppIdEnum, Dialect, OS } from '../enums/app.enum';
import {
  MasterOrderStatusEnum,
  PaymentInstrumentEnum,
  RecurringTransactionStatusEnum,
} from '../enums/common.enums';
import { BaseModel } from './base.entity';
import { RecurringTransaction } from './recurringTransaction.entity';
import { User } from './user.entity';

import { Plan } from 'common/entities/plan.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

@Schema({ _id: false })
class TransactionHistory {
  @Prop({ default: Date.now, type: Date })
  time!: Date;

  @Prop({
    ref: RecurringTransaction.name,
    type: Types.ObjectId,
  })
  txnId!: Types.ObjectId;

  @Prop({ type: String })
  txnStatus!: string;
}

@Schema({ _id: false })
class RenewalData {
  @Prop({ default: null, type: Date })
  conversionDate!: Date | null;

  @Prop({
    ref: RecurringTransaction.name,
    type: Types.ObjectId,
  })
  recurringTxnId!: Types.ObjectId;

  @Prop({ type: Date })
  renewalDate!: Date;

  @Prop({ default: null, type: Number })
  txnAmount!: number | null;
}

@Schema({ timestamps: true })
export class MandateOrder extends BaseModel {
  @Prop({ enum: ClientAppIdEnum, type: String })
  appId!: ClientAppIdEnum;

  @Prop({ enum: Dialect, type: String })
  dialect?: Dialect;

  @Prop({ type: String })
  email?: string;

  @Prop({ default: false, type: Boolean })
  isGSTEnabled!: boolean;

  @Prop({ default: false, type: Boolean })
  isTrial!: boolean;

  @Prop({ type: Number })
  mandateCreationAmount!: number;

  @Prop({ type: Number })
  maxAmount!: number;

  @Prop({ type: String })
  mobile!: string;

  @Prop({ type: Date })
  nextRenewalDate!: Date;

  @Prop({ type: Date })
  nextTriggerDate!: Date;

  @Prop({ enum: OS, type: String })
  os!: OS;

  @Prop({ enum: PaymentInstrumentEnum, type: String })
  paymentInstrument?: PaymentInstrumentEnum;

  @Prop({ enum: PaymentGatewayEnum, type: String })
  pgName!: PaymentGatewayEnum;

  @Prop({ type: String })
  pgSubscriptionId!: string;

  @Prop({ type: String })
  pgTxnId!: string;

  @Prop({ ref: Plan.name, type: Types.ObjectId })
  plan!: Types.ObjectId;

  @Prop({ type: String })
  planId!: string;

  @Prop({ type: Number })
  planPrice!: number;

  @Prop({ ref: Plan.name, type: Types.ObjectId })
  recurringPlan!: Types.ObjectId;

  @Prop({ type: String })
  recurringPlanId!: string;

  @Prop({ default: [], type: [RenewalData] })
  renewalData!: RenewalData[];

  @Prop({ enum: MasterOrderStatusEnum, type: String })
  status!: MasterOrderStatusEnum;

  @Prop({ type: Number })
  transactionAmount!: number;

  @Prop({ enum: RecurringTransactionStatusEnum, type: String })
  txnStatus!: RecurringTransactionStatusEnum;

  @Prop({ type: [TransactionHistory] })
  txnStatusHistory!: TransactionHistory[];

  @Prop({ ref: User.name, type: Types.ObjectId })
  user!: Types.ObjectId;
}
