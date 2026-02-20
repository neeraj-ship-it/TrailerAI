export enum PaymentQueueKeys {
  CHECK_USER_SUBSCRIPTION_STATUS = 'CHECK_USER_SUBSCRIPTION_STATUS',
  DEBIT_NOTIFICATION_CHECK = 'DEBIT_NOTIFICATION_CHECK',
  SUBSCRIPTION_RATE_STATUS_CHECK = 'SUBSCRIPTION_RATE_STATUS_CHECK',
  TRIAL_RATE_STATUS_CHECK = 'TRIAL_RATE_STATUS_CHECK',
  TRIGGER_DEBIT_ALERTS = 'TRIGGER_DEBIT_ALERTS',
  TRIGGER_DEBIT_EXECUTION = 'TRIGGER_DEBIT_EXECUTION',
}

interface SendCronTriggerSRCheckPayload {
  key: PaymentQueueKeys.SUBSCRIPTION_RATE_STATUS_CHECK;
  payload: {
    triggerTime: Date;
    cronName: string;
  };
}
interface SendCronTriggerTRCheckPayload {
  key: PaymentQueueKeys.TRIAL_RATE_STATUS_CHECK;
}

interface SendCronTriggerCheckUserSubscriptionStatusPayload {
  key: PaymentQueueKeys.CHECK_USER_SUBSCRIPTION_STATUS;
}

interface SendCronTriggerTriggerDebitAlertsPayload {
  key: PaymentQueueKeys.TRIGGER_DEBIT_ALERTS;
}

interface SendCronTriggerTriggerDebitExecutionPayload {
  key: PaymentQueueKeys.TRIGGER_DEBIT_EXECUTION;
}
interface SendCronTriggerDebitNotificationCheckPayload {
  key: PaymentQueueKeys.DEBIT_NOTIFICATION_CHECK;
}

export type PaymentQueuePayload =
  | SendCronTriggerSRCheckPayload
  | SendCronTriggerTRCheckPayload
  | SendCronTriggerCheckUserSubscriptionStatusPayload
  | SendCronTriggerTriggerDebitAlertsPayload
  | SendCronTriggerTriggerDebitExecutionPayload
  | SendCronTriggerDebitNotificationCheckPayload;
