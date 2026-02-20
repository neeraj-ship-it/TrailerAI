import { StringConstants } from '@app/common/constants/string.constant';
import {
  PaymentAppName,
  PaymentAppPackageName,
  PaymentAppShortName,
  PaymentGatewayShortName,
} from '@app/common/entities/setting.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export const paymentOptionEntityResponse = {
  paymentOptions: [
    {
      appName: PaymentAppName.PAYTM,
      appShortName: PaymentAppShortName.PAYTM,
      displayText: StringConstants.recommendedPaymentOptionText,
      isEnabled: true,
      packageName: PaymentAppPackageName.PAYTM,
      paymentGateway: PaymentGatewayEnum.PAYTM,
      pgShortName: PaymentGatewayShortName.PHONEPE,
    },
    {
      appName: PaymentAppName.PHONEPE,
      appShortName: PaymentAppShortName.PHONEPE,
      displayText: '',
      isEnabled: true,
      packageName: PaymentAppPackageName.PHONEPE,
      paymentGateway: PaymentGatewayEnum.PHONEPE,
      pgShortName: PaymentGatewayShortName.PAYTM,
    },
    {
      appName: PaymentAppName.GPAY,
      appShortName: PaymentAppShortName.GPAY,
      displayText: '',
      isEnabled: true,
      packageName: PaymentAppPackageName.GPAY,
      paymentGateway: PaymentGatewayEnum.PHONEPE,
      pgShortName: PaymentGatewayShortName.PHONEPE,
    },
    {
      appName: PaymentAppName.OTHER,
      appShortName: PaymentAppShortName.OTHER,
      displayText: '',
      isEnabled: false,
      packageName: PaymentAppPackageName.JUSPAY,
      paymentGateway: PaymentGatewayEnum.JUSPAY,
      pgShortName: PaymentGatewayShortName.JUSPAY,
    },
  ],
};
