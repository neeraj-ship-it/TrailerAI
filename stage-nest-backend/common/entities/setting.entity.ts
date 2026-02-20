import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';
import { PaymentOptionsGroupName } from 'src/users/dtos/experiment.dto';

export enum PaymentAppName {
  GPAY = 'Google Pay',
  OTHER = 'अन्य पेमेंट ऑप्शन',
  PAYTM = 'Paytm',
  PHONEPE = 'PhonePe',
  QR = 'Qr Code',
  UPI_APPS = 'UPI ऐप से पे करें',
  UPI_COLLECT = 'UPI ID का उपयोग करें',
}

export enum PaymentGatewayShortName {
  APPLE_PAY = 'APPLE_PAY',
  BACKEND = 'BACKEND',
  CMS = 'CMS',
  JUSPAY = 'JPYPG',
  JUSPAY_SDK = 'JPYSDK',
  PAYTM = 'PTMPG',
  PHONEPE = 'PHPPG',
  RAZORPAY = 'RZPAY', // FIXME: change with actual value
  SETU = 'SETUPG',
}

export enum PaymentAppShortName {
  GPAY = 'GPY',
  OTHER = 'JPY',
  PAYTM = 'PTM',
  PHONEPE = 'PHP',
  QR = 'QR',
  UPI = 'BTM',
  UPI_COLLECT = 'UPIID',
}

export enum PaymentAppPackageName {
  GPAY = 'com.google.android.apps.nbu.paisa.user',
  JUSPAY = 'JUSPAYSDK',
  PAYTM = 'net.one97.paytm',
  PHONEPE = 'com.phonepe.app',
  QR = 'qrCode',
  UPI = 'allApps',
  UPI_COLLECT = 'upiCollect',
}

@Schema({ _id: false })
export class PaymentOption {
  @Prop({ type: Boolean })
  applyAppInstallCheck?: boolean;

  @Prop({ enum: PaymentAppName, required: true, type: String })
  appName!: PaymentAppName;

  @Prop({ enum: PaymentAppShortName, type: String })
  appShortName?: PaymentAppShortName;

  @Prop({ type: String })
  displayText?: string;

  @Prop({ enum: PaymentOptionsGroupName, type: String })
  groupName?: PaymentOptionsGroupName;

  @Prop({ type: String })
  imagePath?: string;

  @Prop({ required: true, type: Boolean })
  isEnabled!: boolean;

  @Prop({ enum: PaymentAppPackageName, required: true, type: String })
  packageName!: PaymentAppPackageName;

  @Prop({ type: Number })
  paymentFailurePopupDelay?: number;

  @Prop({ enum: PaymentGatewayEnum, required: true, type: String })
  paymentGateway!: PaymentGatewayEnum;

  @Prop({ enum: PaymentGatewayShortName, type: String })
  pgShortName?: PaymentGatewayShortName;

  @Prop({ type: Number })
  rank?: number;

  @Prop({ type: Number })
  showIfOptionsCountBelow?: number;

  @Prop({ type: Boolean })
  visibleByDefault?: boolean;
}

@Schema({ _id: false })
class GlobalSettings {
  @Prop({ type: String })
  contentDetailFreeEpisode?: string;

  @Prop({ type: String })
  contentDetailFreeTrailEnd?: string;

  @Prop({ type: String })
  contentDetailFreeTrailStart?: string;

  @Prop({ type: String })
  subscriptionImage?: string;
}

@Schema({ _id: false })
class PlatformSettings {
  @Prop({ type: GlobalSettings })
  global?: GlobalSettings;

  @Prop({ type: Boolean })
  isCouponSectionVisible?: boolean;

  @Prop({ type: String })
  subscriptionImage?: string;
}

@Schema({ _id: false })
class CommonForPlatforms {
  @Prop([String])
  carouselImage?: string[];

  @Prop({ type: String })
  contentDetailFreeEpisode?: string;

  @Prop({ type: String })
  contentDetailFreeTrailEnd?: string;

  @Prop({ type: String })
  contentDetailFreeTrailStart?: string;

  @Prop({ type: String })
  customerGluBanner?: string;

  @Prop({ type: String })
  freeSubscriptionBanner?: string;

  @Prop({ type: String })
  freeSubscriptionOptInBanner?: string;

  @Prop({ type: String })
  freeSubscriptionOptInBtn?: string;

  @Prop({ type: String })
  freeSubscriptionRemainingDaysText?: string;

  @Prop({ type: String })
  freeSubscriptionSettingScreenText?: string;

  @Prop({ type: GlobalSettings })
  global!: GlobalSettings;

  @Prop({ type: String })
  renewalImage?: string;

  @Prop({ type: String })
  supportNumberTvRegister?: string;

  @Prop({ type: String })
  whatsAppCommunityBanner?: string;
}

@Schema({ _id: false })
class LanguageSettings {
  @Prop({ type: PlatformSettings })
  android!: PlatformSettings;

  @Prop({ type: CommonForPlatforms })
  commonForPlatforms!: CommonForPlatforms;

  @Prop({ type: PlatformSettings })
  ios!: PlatformSettings;

  @Prop({ type: PlatformSettings })
  tv!: PlatformSettings;

  @Prop({ type: PlatformSettings })
  web!: PlatformSettings;
}

@Schema({ _id: false })
class CommonForLangs {
  @Prop({ type: Date })
  freeSubscriptionEndDate!: Date;

  @Prop({ type: Date })
  freeSubscriptionStartDate!: Date;

  @Prop({ type: String })
  supportNumber!: string;

  @Prop({ type: String })
  whatsappNumber!: string;
}

@Schema({ _id: false })
class DialectSettings {
  @Prop({ required: true, type: CommonForLangs })
  commonForLangs!: CommonForLangs;

  @Prop({ required: true, type: LanguageSettings })
  en!: LanguageSettings;

  @Prop({ required: true, type: LanguageSettings })
  hin!: LanguageSettings;
}

@Schema({ _id: false })
class CommonForDialectsLangSpecific {
  @Prop({ type: String })
  contentDetailStripImage?: string;

  @Prop({ type: GlobalSettings })
  global?: GlobalSettings;

  @Prop({
    type: {
      subTitle: String,
      title: String,
    },
  })
  mobikwikDetails?: {
    title: string;
    subTitle: string;
  };

  @Prop({ type: String })
  renewalImage?: string;

  @Prop({ type: String })
  subscriptionImage?: string;
}

@Schema({ _id: false })
class CommonForLangsSettings {
  @Prop({ type: String })
  appLogo?: string;

  @Prop({ type: Number })
  appVersion?: number;

  @Prop({ type: String })
  basePath?: string;

  @Prop({ type: String })
  baseURL?: string;

  @Prop({ type: String })
  careerPageUrl?: string;

  @Prop({ type: Boolean })
  cashOption?: boolean;

  @Prop({ type: String })
  customerGluBanner?: string;

  @Prop({ type: String })
  customerGluBannerNS?: string;

  @Prop({ required: true, type: [PaymentOption] })
  customPaymentOptions!: PaymentOption[];

  @Prop({ type: String })
  defaultConsumptionBitrate?: string;

  @Prop({ type: String })
  defaultCouponCode?: string;

  @Prop({ type: Boolean })
  filmAvailable?: boolean;

  @Prop({ type: Boolean })
  freemiumPopUpAvailable?: boolean;

  @Prop({ type: Boolean })
  freeTrialAvailable?: boolean;

  @Prop({ type: Boolean })
  isAFTOn?: boolean;

  @Prop({ type: Boolean })
  isChangePlanVisible?: boolean;

  @Prop({ type: Boolean })
  isCouponSectionVisible?: boolean;

  @Prop({ type: Boolean })
  isDefaultCouponApplied?: boolean;

  @Prop({ type: Boolean })
  isGenreBoxVisible?: boolean;

  @Prop({ type: Boolean })
  isHomeScreenDialectSelection?: boolean;

  @Prop({ type: Boolean })
  isManageSubscriptionVisible?: boolean;

  @Prop({ type: Boolean })
  isMobikwikOn?: boolean;

  @Prop({ type: Boolean })
  isPayAlertShow?: boolean;

  @Prop({ type: Boolean })
  isPlayBillingEnabled?: boolean;

  @Prop({ type: Boolean })
  isRefferalOn?: boolean;

  @Prop({ type: Boolean })
  isShortzActive?: boolean;

  @Prop({ type: Boolean })
  isSubscriptionTrialEnabled?: boolean;

  @Prop({ type: Boolean })
  isUpgradePlan?: boolean;

  @Prop({ type: Boolean })
  isWhatsAppCommunityOn?: boolean;

  @Prop({ type: Number })
  logoWidth?: number;

  @Prop({ type: Number })
  maxSubscriptionTrialsAllowed?: number;

  @Prop({ type: Number })
  mobikwikCashbackAmount?: number;

  @Prop({ required: true, type: [PaymentOption] })
  paymentOptions!: PaymentOption[];

  @Prop({ required: true, type: [PaymentOption] })
  paywallPaymentOptions!: PaymentOption[];

  @Prop({ type: String })
  priceSymbol?: string;

  @Prop({ type: [String] })
  rm_numbers?: string[];

  @Prop({ type: Boolean })
  showConsumptionNudge?: boolean;

  @Prop({ type: Boolean })
  showDialectSelection?: boolean;

  @Prop({ type: [String] })
  showMobikwikOnPlans?: string[];

  @Prop({ type: Number })
  subscriptionTimer?: number;

  @Prop({ type: Number })
  subscriptionTrialCohort?: number;

  @Prop({ type: Boolean })
  supportCta?: boolean;

  @Prop({ type: String })
  supportNumber?: string;

  @Prop({ type: Boolean })
  tnplAutoPlayVideo?: boolean;

  @Prop({ type: Number })
  tnplCheckoutButtonTimer?: number;

  @Prop({ type: Number })
  trialTimer?: number;

  @Prop({ type: Boolean })
  updateProfileOnHomeEnabled?: boolean;

  @Prop([String])
  updateProfileOnHomeEnabledDays?: string[];

  @Prop([String])
  updateProfileOnHomePopupFrequency?: string[];

  @Prop({ type: Boolean })
  updateProfileSubscriptionPopupEnabled?: boolean;

  @Prop({ required: true, type: [PaymentOption] })
  webPaymentOptions!: PaymentOption[];

  @Prop({ type: Boolean })
  webSeriesAvailable?: boolean;

  @Prop({ type: Boolean })
  whatsAppCta?: boolean;

  @Prop({ type: String })
  whatsappNumber?: string;
}

@Schema({ _id: false })
class CommonForDialects {
  @Prop({ type: CommonForLangsSettings })
  commonForLangs!: CommonForLangsSettings;

  @Prop({ type: CommonForDialectsLangSpecific })
  en!: CommonForDialectsLangSpecific;

  @Prop({ type: CommonForDialectsLangSpecific })
  hin!: CommonForDialectsLangSpecific;
}

@Schema({ minimize: false, timestamps: true })
export class Setting extends BaseModel {
  @Prop({ required: true, type: CommonForDialects })
  commonForDialects!: CommonForDialects;

  @Prop({ required: true, type: DialectSettings })
  har!: DialectSettings;

  @Prop({ required: true, type: DialectSettings })
  raj!: DialectSettings;
}
