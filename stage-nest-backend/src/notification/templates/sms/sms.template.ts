import { SMS_GATEWAY_PROVIDERS } from '../../../notification/interfaces/notificationGateway.interface';
import { SmsNotificationKeys } from '../../../notification/interfaces/notificationKeys.interface';
import { CeletelSmsTemplates } from './sms.celetel.template';
import { GupshupSmsTemplates } from './sms.gupshup.template';

export const SmsTemplates = {
  [SmsNotificationKeys.SEND_LOGIN_OTP]: {
    [SMS_GATEWAY_PROVIDERS.CELETEL]: CeletelSmsTemplates.SEND_LOGIN_OTP,
    [SMS_GATEWAY_PROVIDERS.GUPSHUP]: GupshupSmsTemplates.SEND_LOGIN_OTP,
  },
  [SmsNotificationKeys.SEND_REFUND_NOTIFICATION]: {
    [SMS_GATEWAY_PROVIDERS.CELETEL]:
      CeletelSmsTemplates.SEND_REFUND_NOTIFICATION,
    [SMS_GATEWAY_PROVIDERS.GUPSHUP]:
      GupshupSmsTemplates.SEND_REFUND_NOTIFICATION,
  },
};
