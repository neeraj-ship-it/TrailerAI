import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

import { CurrencySymbolEnum } from '../enums/app.enum';
import { BaseModel } from './base.entity';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
@Schema()
class PlayBillingPurchaseDetails {
  @Prop({ type: Boolean })
  acknowledged!: boolean;

  @Prop({ type: Boolean })
  autoRenewing!: boolean;

  @Prop({ type: String })
  orderId!: string;

  @Prop({ type: String })
  packageName!: string;

  @Prop({ type: String })
  productId!: string;

  @Prop({ type: Number })
  purchaseState!: number;

  @Prop({ type: Number })
  purchaseTime!: number;

  @Prop({ type: String })
  purchaseToken!: string;

  @Prop({ type: Number })
  quantity!: number;
}
@Schema()
class InApp {
  @Prop({ type: String })
  expires_date?: string;

  @Prop({ type: String })
  expires_date_ms?: string;

  @Prop({ type: String })
  expires_date_pst?: string;

  @Prop({ type: String })
  in_app_ownership_type!: string;

  @Prop({ type: String })
  is_in_intro_offer_period?: string;

  @Prop({ type: String })
  is_trial_period!: string;

  @Prop({ type: String })
  original_purchase_date!: string;

  @Prop({ type: String })
  original_purchase_date_ms!: string;

  @Prop({ type: String })
  original_purchase_date_pst!: string;

  @Prop({ type: String })
  original_transaction_id!: string;

  @Prop({ type: String })
  product_id!: string;

  @Prop({ type: String })
  purchase_date!: string;

  @Prop({ type: String })
  purchase_date_ms!: string;

  @Prop({ type: String })
  purchase_date_pst!: string;

  @Prop({ type: String })
  quantity!: string;

  @Prop({ type: String })
  transaction_id!: string;

  @Prop({ type: String })
  web_order_line_item_id?: string;
}

@Schema()
class ReceiptInfo {
  @Prop({ type: Number })
  adam_id!: number;

  @Prop({ type: Number })
  app_item_id!: number;

  @Prop({ type: String })
  application_version!: string;

  @Prop({ type: String })
  bundle_id!: string;

  @Prop({ type: Number })
  download_id!: number;

  @Prop({ type: [InApp] })
  in_app?: InApp[];

  @Prop({ type: String })
  original_application_version!: string;

  @Prop({ type: String })
  original_purchase_date!: string;

  @Prop({ type: String })
  original_purchase_date_ms!: string;

  @Prop({ type: String })
  original_purchase_date_pst!: string;

  @Prop({ type: String })
  receipt_creation_date!: string;

  @Prop({ type: String })
  receipt_creation_date_ms!: string;

  @Prop({ type: String })
  receipt_creation_date_pst!: string;

  @Prop({ type: String })
  receipt_type!: string;

  @Prop({ type: String })
  request_date!: string;

  @Prop({ type: String })
  request_date_ms!: string;

  @Prop({ type: String })
  request_date_pst!: string;

  @Prop({ type: Number })
  version_external_identifier!: number;
}
@Schema()
class LatestReceiptInfo {
  @Prop({ type: String })
  expires_date!: string;

  @Prop({ type: String })
  expires_date_ms!: string;

  @Prop({ type: String })
  expires_date_pst!: string;

  @Prop({ type: String })
  in_app_ownership_type!: string;

  @Prop({ type: String })
  is_in_intro_offer_period!: string;

  @Prop({ type: String })
  is_trial_period!: string;

  @Prop({ type: String })
  original_purchase_date!: string;

  @Prop({ type: String })
  original_purchase_date_ms!: string;

  @Prop({ type: String })
  original_purchase_date_pst!: string;

  @Prop({ type: String })
  original_transaction_id!: string;

  @Prop({ type: String })
  product_id!: string;

  @Prop({ type: String })
  purchase_date!: string;

  @Prop({ type: String })
  purchase_date_ms!: string;

  @Prop({ type: String })
  purchase_date_pst!: string;

  @Prop({ type: String })
  quantity!: string;

  @Prop({ type: String })
  subscription_group_identifier!: string;

  @Prop({ type: String })
  transaction_id!: string;

  @Prop({ type: String })
  web_order_line_item_id!: string;
}

@Schema()
class PendingRenewalInfo {
  @Prop({ required: true })
  auto_renew_product_id!: string;

  @Prop({ required: true })
  auto_renew_status!: string;

  @Prop({ required: true })
  expiration_intent!: string;

  @Prop({ required: true })
  is_in_billing_retry_period!: string;

  @Prop({ required: true })
  original_transaction_id!: string;

  @Prop({ required: true })
  product_id!: string;
}

@Schema({
  collection: 'userSubscriptionHistory',
  strict: true,
  timestamps: true,
  versionKey: false,
})
export class UserSubscriptionHistory extends BaseModel {
  @Prop({ type: Number })
  actualPlanPrice!: number;

  @Prop({ type: Number })
  actualPrice!: number;

  @Prop({ type: String })
  adid?: string;

  @Prop({ type: String })
  cmsLoginEmail?: string;

  @Prop({ type: String })
  cmsLoginId?: string;

  @Prop({ type: String })
  cmsLoginName?: string;

  @Prop({ type: String })
  cmsLoginNumber?: string;

  @Prop({ type: String })
  country!: string;

  @Prop({ type: String })
  couponCode?: string;

  @Prop({ type: String })
  couponPartnerName?: string;

  @Prop({ type: Number })
  couponStoreId?: number;

  @Prop({ type: String })
  couponStoreName?: string;

  @Prop({ type: String })
  currency!: string;

  @Prop({ enum: CurrencySymbolEnum, type: String })
  currencySymbol!: CurrencySymbolEnum;

  @Prop({ type: String })
  deviceId!: string;

  @Prop({ type: String })
  dialect!: string;

  @Prop({ type: Number })
  discount!: number;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  gps_adid?: string;

  @Prop({ type: String })
  idfa?: string;

  @Prop({ default: false, type: Boolean })
  isGlobal!: boolean;

  @Prop({ type: Boolean })
  isRecommended?: boolean;

  @Prop({ type: Boolean })
  isRecurring!: boolean;

  @Prop({ default: false, type: Boolean })
  isRecurringSubscription?: boolean;

  @Prop({ type: Boolean })
  isRenew!: boolean;

  @Prop({ type: Boolean })
  isTnplUser?: boolean;

  @Prop({ default: false, type: Boolean })
  isTrial?: boolean;

  @Prop({ type: Boolean })
  isUpgrade!: boolean;

  @Prop({ type: String })
  itemId!: string;

  @Prop({ default: '', type: String })
  juspayOrderId?: string;

  @Prop({ type: String })
  latest_receipt?: string;

  @Prop({ type: [LatestReceiptInfo] })
  latest_receipt_info?: LatestReceiptInfo[];

  @Prop({
    default: null,
    ref: 'mandateorders',
    type: mongoose.Schema.Types.ObjectId,
  })
  mandateOrderId?: Types.ObjectId;

  @Prop({
    default: null,
    ref: 'mastermandates',
    type: mongoose.Schema.Types.ObjectId,
  })
  masterMandateId?: Types.ObjectId;

  @Prop({
    default: null,
    ref: 'juspayorders',
    type: mongoose.Schema.Types.ObjectId,
  })
  order?: Types.ObjectId;

  @Prop({ type: String })
  os!: string;

  @Prop({ type: String })
  partnerCustomerId?: string;

  @Prop({ type: Number })
  payingPrice!: number;

  @Prop({ type: String })
  paymentGateway?: string;

  @Prop({ type: [PendingRenewalInfo] })
  pending_renewal_info?: PendingRenewalInfo[];

  @Prop({ type: String })
  planDays!: string;

  @Prop({ type: String })
  planId!: string;

  @Prop({ type: String })
  planType!: string;

  @Prop({ type: String })
  platform!: string;

  @Prop({ type: PlayBillingPurchaseDetails })
  playBillingPurchaseDetails?: PlayBillingPurchaseDetails;

  @Prop({ type: String })
  playBillingVerificationData?: string;

  @Prop({ type: Object })
  previousSubscription?: Record<string, string>;

  @Prop({ type: String })
  primaryMobileNumber!: string;

  @Prop({ type: String })
  providerId?: string;

  @Prop({ type: String })
  receipt?: string;

  @Prop({ type: [ReceiptInfo] })
  recieptInfo?: ReceiptInfo;

  @Prop({ type: [String] })
  remarks?: string[];

  @Prop({ type: Number })
  renewalRecurringCount?: number;

  @Prop({ type: Number })
  saved!: number;

  @Prop({ type: String })
  signature?: string;

  @Prop({ type: String })
  status!: string;

  @Prop({ type: Date })
  subscriptionDate!: Date;

  @Prop({ required: true, type: String })
  subscriptionId!: string;

  @Prop({ type: String })
  subscriptionThrough!: string;

  @Prop({ type: Date })
  subscriptionValid!: Date;

  @Prop({ type: Number })
  totalCount?: number;

  @Prop({ type: String })
  userId!: string;

  @Prop({ enum: PaymentGatewayEnum, type: String })
  vendor!: PaymentGatewayEnum;
}
