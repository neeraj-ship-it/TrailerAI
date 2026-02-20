import { SmsNotificationKeys } from '../../../notification/interfaces/notificationKeys.interface';
import { SendLoginOtp } from '../../../notification/interfaces/smsPayloads.interface';

export const GupshupSmsTemplates = {
  [SmsNotificationKeys.SEND_LOGIN_OTP]: ({ hashKey, otp }: SendLoginOtp) =>
    `Please use ${otp} as OTP for login on your STAGE account. ${hashKey}`,
  [SmsNotificationKeys.SEND_REFUND_NOTIFICATION]: `आपकी रिफंड प्रक्रिया शुरू हो गई है! -STAGE`,
};
