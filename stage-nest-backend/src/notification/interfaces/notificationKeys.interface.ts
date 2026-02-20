export enum SlackNotificationKeys {
  PRE_DEBIT_NOTIFICATION_CRON_TRIGGER = 'PRE_DEBIT_NOTIFICATION_CRON_TRIGGER',
}

export enum SmsNotificationKeys {
  SEND_LOGIN_OTP = 'SEND_LOGIN_OTP',
  SEND_REFUND_NOTIFICATION = 'SEND_REFUND_NOTIFICATION',
}

export enum WhatsappNotificationKeys {
  SEND_TRIAL_ACTIVATED_NOTIFICATION_HARYANA = 'SEND_TRIAL_ACTIVATED_NOTIFICATION_HARYANA',
}

export interface INotificationConfig {
  slack?: SlackNotificationKeys;
  sms?: SmsNotificationKeys;
  whatsapp?: WhatsappNotificationKeys;
}
