import { Dialect } from '@app/common/enums/app.enum';

export enum NotificationKeys {
  SEND_CMS_ASSET_MONITORING_NOTIFICATION = 'SEND_CMS_ASSET_MONITORING_NOTIFICATION',
  SEND_CRON_TRIGGER_NOTIFICATION = 'SEND_CRON_TRIGGER_NOTIFICATION',
  SEND_LOGIN_OTP = 'SEND_LOGIN_OTP',
  SEND_REFUND_TRIGGER_NOTIFICATION = 'SEND_REFUND_TRIGGER_NOTIFICATION',
  SEND_SR_ALERT_NOTIFICATION = 'SEND_SR_ALERT_NOTIFICATION',
  SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION = 'SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION',
  SEND_TR_ALERT_NOTIFICATION = 'SEND_TR_ALERT_NOTIFICATION',
  SEND_TRIAL_ACTIVATED_NOTIFICATION = 'SEND_TRIAL_ACTIVATED_NOTIFICATION',
  SEND_TRIAL_CONVERSION_NOTIFICATION = 'SEND_TRIAL_CONVERSION_NOTIFICATION',
  SEND_TRIAL_FAIL_NOTIFICATION = 'SEND_TRIAL_FAIL_NOTIFICATION',
}

export interface SendCmsAssetMonitoringNotificationPayload {
  key: NotificationKeys.SEND_CMS_ASSET_MONITORING_NOTIFICATION;
  payload: {
    message: string;
  };
}

export interface SendSRAlertPayload {
  key: NotificationKeys.SEND_SR_ALERT_NOTIFICATION;
  payload: {
    message: string;
  };
}

export interface SendTRAlertPayload {
  key: NotificationKeys.SEND_TR_ALERT_NOTIFICATION;
  payload: {
    message: string;
  };
}
interface SendLoginOtpPayload {
  key: NotificationKeys.SEND_LOGIN_OTP;
  payload: {
    hashKey: string;
    otp: string;
    recipient: string;
  };
}
export interface SendRefundNotificationPayload {
  key: NotificationKeys.SEND_REFUND_TRIGGER_NOTIFICATION;
  payload: {
    recipient: string;
  };
}

interface SendCronTriggerNotificationPayload {
  key: NotificationKeys.SEND_CRON_TRIGGER_NOTIFICATION;
  payload: {
    triggerTime: Date;
    cronName: string;
  };
}

export interface SendTrialActivatedNotificationPayload {
  key: NotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION;
  payload: {
    recipient: string;
    trialDays: number;
    dialect: Dialect;
    postTrialPrice: number;
    postTrialMonths: number;
  };
}
export interface SendTrialConversionNotificationPayload {
  key: NotificationKeys.SEND_TRIAL_CONVERSION_NOTIFICATION;
  payload: {
    recipient: string;
    trialDays: number;
    dialect: Dialect;
    postTrialPrice: number;
    postTrialMonths: number;
  };
}
export interface SendTrialFailNotificationPayload {
  key: NotificationKeys.SEND_TRIAL_FAIL_NOTIFICATION;
  payload: {
    recipient: string;
    dialect: Dialect;
    postTrialPrice: number;
  };
}
export interface SendSubscriptionSuccessNotificationPayload {
  key: NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION;
  payload: {
    recipient: string;
    dialect: Dialect;
  };
}

export type NotificationPayload =
  | SendLoginOtpPayload
  | SendCronTriggerNotificationPayload
  | SendTrialActivatedNotificationPayload
  | SendSRAlertPayload
  | SendRefundNotificationPayload
  | SendTRAlertPayload
  | SendSubscriptionSuccessNotificationPayload
  | SendTrialFailNotificationPayload
  | SendTrialConversionNotificationPayload
  | SendCmsAssetMonitoringNotificationPayload;
