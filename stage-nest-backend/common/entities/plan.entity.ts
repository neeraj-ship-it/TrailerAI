import { Prop, Schema } from '@nestjs/mongoose';

import {
  PlanCountryEnum,
  PlanStatusEnum,
  PlanTypesEnum,
} from '@app/payment/enums/plan.enum';

import {
  BaseButtonPaywallItem,
  MediaImagePaywallItem,
  MediaVideoPaywallItem,
} from './paywall.entity';
import { BaseModel } from 'common/entities/base.entity';
import {
  CurrencyEnum,
  CurrencySymbolEnum,
  Lang,
  OS,
} from 'common/enums/app.enum';

export enum DayCountEnum {
  DEFAULT = 'default',
  TRIAL = 'trial',
}

interface MediaAssetStructure {
  buttonItem: BaseButtonPaywallItem;
  footerText: string;
  paywallAssets: [MediaImagePaywallItem, MediaVideoPaywallItem];
  renewalImage: string;
  subscriptionImage: string;
}
@Schema({ timestamps: true })
export class Plan extends BaseModel {
  @Prop({ required: true })
  actualPrice!: number;

  @Prop({ type: [String] })
  cardOptionen!: string[];

  @Prop({ type: [String] })
  cardOptionhin!: string[];

  @Prop({ enum: PlanCountryEnum, required: true, type: String })
  country!: PlanCountryEnum;

  @Prop({ enum: CurrencyEnum, required: true, type: String })
  currency!: CurrencyEnum;

  @Prop({ enum: CurrencySymbolEnum, required: true, type: String })
  currencySymbol!: CurrencySymbolEnum;

  @Prop({ type: String })
  dayCount!: DayCountEnum;

  @Prop({ default: 0, type: Number })
  discount!: number;

  @Prop({ default: false, type: Boolean })
  isRecommended!: boolean;

  @Prop({ default: true, type: Boolean })
  isRecurring!: boolean;

  @Prop({ default: false, type: Boolean })
  isTrailPlan!: boolean;

  @Prop({ required: true, type: String })
  itemId!: string;

  @Prop({ type: Number })
  mandateSetupPayingPrice!: number;

  @Prop({ type: Object })
  mediaAssets!: Record<Lang, MediaAssetStructure>;

  @Prop({ type: String })
  offerTextEn!: string;

  @Prop({ type: String })
  offerTextHin!: string;

  @Prop({ enum: OS, required: true, type: String })
  os!: OS;

  @Prop({ required: true, type: Number })
  payingPrice!: number;

  @Prop({ type: String, unique: false })
  paywallId!: string;

  @Prop({ type: String })
  planDays!: string;

  @Prop({ required: true })
  planId!: string;

  @Prop({ type: [String] })
  planPartOfABTestGroup!: string[];

  @Prop({ type: String })
  planTagsEn!: string;

  @Prop({ type: String })
  planTagsHin!: string;

  @Prop({ default: PlanTypesEnum.QUARTERLY, enum: PlanTypesEnum, type: String })
  planType!: PlanTypesEnum;

  @Prop({ type: String })
  planTypeHin!: string;

  @Prop({ type: String })
  planTypeMode!: string;

  @Prop({ type: String })
  planTypeText!: string;

  @Prop({ type: String })
  planTypeTextHin!: string;

  @Prop({ type: String })
  postSubscriptionPlan?: string;

  @Prop({ type: String })
  postTrialPlan!: string;

  @Prop({ default: 0, type: Number })
  priority!: number;

  @Prop({ default: 0, type: Number })
  saved!: number;

  @Prop({
    default: PlanStatusEnum.ACTIVE,
    enum: PlanStatusEnum,
    required: true,
    type: String,
  })
  status!: PlanStatusEnum;

  @Prop({
    get: (value: string | Date) => {
      return typeof value === 'string' ? new Date(value) : value; // TODO: Test it, it should throw exception if string date is not parsable
    },
    type: Date,
  })
  subscriptionDate!: Date;

  @Prop({
    get: (value: string | Date) => {
      return typeof value === 'string' ? new Date(value) : value; // TODO: Test it, it should throw exception if string date is not parsable
    },
    type: Date,
  })
  subscriptionValid!: Date;

  @Prop({ type: Number })
  totalCount!: number;

  @Prop({ type: Number })
  totalDays!: number;
}
