import { SmsNotificationKeys } from '../../../notification/interfaces/notificationKeys.interface';
import { SendLoginOtp } from '../../../notification/interfaces/smsPayloads.interface';

export const CeletelSmsTemplates = {
  [SmsNotificationKeys.SEND_LOGIN_OTP]: ({ hashKey, otp }: SendLoginOtp) => ({
    content: `Please use ${otp} as OTP for login on your STAGE account. ${hashKey}`,
    templateId: '1707164395724674031',
  }),
  [SmsNotificationKeys.SEND_REFUND_NOTIFICATION]: `आपकी रिफंड प्रक्रिया शुरू हो गई है! -STAGE`,
};
