import { Dialect } from '@app/common/enums/app.enum';

export interface SendTrialActivatedNotification {
  dialect: Dialect;
  phoneNumber: string;
  postTrialMonths: number;
  postTrialPrice: number;
  trialDays: number;
}
export interface SendTrialConversionNotification {
  dialect: Dialect;
  phoneNumber: string;
  postTrialMonths: number;
  postTrialPrice: number;
  trialDays: number;
}
export interface SendTrialFailNotification {
  dialect: Dialect;
  phoneNumber: string;
  postTrialPrice: number;
}
export interface SendSubscriptionSuccessNotification {
  dialect: Dialect;
  phoneNumber: string;
}
