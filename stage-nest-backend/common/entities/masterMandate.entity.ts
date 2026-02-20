import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from './base.entity';
import { RecurringTransaction } from './recurringTransaction.entity';
import { User } from './user.entity';
import { MasterMandateStatusEnum } from 'common/enums/common.enums';

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
export class EventProperties {
  @Prop({ type: [String] })
  content_ids!: string[];
}

@Schema({ _id: false })
export class RenewalData {
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

@Schema({ _id: false })
export class ExtensionObject {
  @Prop({ type: Date })
  extension_Date!: Date;
  @Prop({ type: String })
  extension_planId!: string;
  @Prop({ type: String })
  extension_planType!: string;
}

@Schema({ strict: false, timestamps: true })
export class MasterMandate extends BaseModel {
  @Prop({ type: String })
  appId!: string;

  @Prop({ type: String })
  coupon!: string;

  @Prop({ type: String })
  couponPartnerName!: string;

  @Prop({ type: String })
  dialect!: string;

  @Prop({ type: String })
  email!: string;

  @Prop({ type: EventProperties })
  eventProperties?: EventProperties;
  @Prop({ type: [ExtensionObject] })
  extension?: ExtensionObject[];

  @Prop({ default: false, type: Boolean })
  isGSTEnabled!: boolean;

  @Prop({ default: false, type: Boolean })
  isTrial!: boolean;

  @Prop({ type: Number })
  mandateCreationAmount!: number;

  @Prop({ ref: 'MandateOrder', type: Types.ObjectId })
  mandateOrderId!: Types.ObjectId;

  @Prop({ type: Number })
  maxAmount!: number;

  @Prop({ type: String })
  mobile!: string;

  @Prop({ type: Date })
  nextRenewalDate!: Date;

  @Prop({ type: Date })
  nextTriggerDate!: Date;

  @Prop({ type: String })
  os!: string;

  @Prop({ type: String })
  partnerCoupon!: string;

  @Prop({ ref: 'PartnerCoupon', type: Types.ObjectId })
  partnerCouponId!: Types.ObjectId;

  @Prop({ type: Number })
  partnerCouponStoreId!: number;

  @Prop({ type: String })
  partnerCouponStoreName!: string;

  @Prop({ type: String })
  paymentBankDetails!: string;

  @Prop({ type: String })
  paymentGateway!: string;

  @Prop({ type: String })
  paymentGatewayDisplayed!: string;

  @Prop({ type: String })
  paymentGatewayName!: string;

  @Prop({ type: String })
  paymentMethod!: string;

  @Prop({ type: String })
  paymentOptions!: string;

  @Prop({ type: String })
  paymentOptionsDisplayed!: string;

  @Prop({ type: String })
  pgName!: string;

  @Prop({ type: String })
  pgSubscriptionId!: string;

  @Prop({ type: String })
  pgTxnId!: string;

  @Prop({ ref: 'Plan', type: Types.ObjectId })
  plan!: Types.ObjectId;

  @Prop({ type: String })
  planId!: string;

  @Prop({ type: Number })
  planPrice!: number;

  @Prop({ type: String })
  platform!: string;

  @Prop({ ref: 'Plan', type: Types.ObjectId })
  recurringPlan!: Types.ObjectId;

  @Prop({ type: String })
  recurringPlanId!: string;

  @Prop({ ref: RecurringTransaction.name, type: Types.ObjectId })
  recurringTxnId!: Types.ObjectId;

  @Prop({ type: String })
  redirectUrl!: string;

  @Prop({ type: RenewalData })
  renewalData!: RenewalData[];

  @Prop({ enum: MasterMandateStatusEnum, type: String })
  status!: MasterMandateStatusEnum;

  @Prop([
    {
      status: { enum: MasterMandateStatusEnum, type: String },
      time: { type: Date },
    },
  ])
  statusHistory!: { status: MasterMandateStatusEnum; time: Date }[];

  @Prop({ type: String })
  targetApp!: string;

  @Prop({ type: Number })
  transactionAmount!: number;

  @Prop({ type: String })
  txnStatus!: string;

  @Prop({ type: [TransactionHistory] })
  txnStatusHistory!: TransactionHistory[];

  @Prop({ ref: User.name, type: Types.ObjectId })
  user!: Types.ObjectId;

  //   @Prop({ type: Object })
  //   refundDetails!: Record<string, any>;  //TODO: Need to check if required anymore
}
