import {
  PaymentAppName,
  PaymentAppPackageName,
} from '@app/common/entities/setting.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export interface PGConfigResponseDTO {
  customPaymentOptions: PaymentOptions[];
  paymentOptions: PaymentOptions[];
  paywallPaymentOptions: PaymentOptions[];
  // possiblePGCombinations: Record<PaymentGatewayEnum, AllowedPGValues>; // not required at the moment
  possibleAppCombinations: Record<PaymentAppName, AllowedAppValues>;
  webPaymentOptions: PaymentOptions[];
}

export interface AllowedPGValues {
  pgShortName: string;
}

export interface AllowedAppValues {
  appName: PaymentAppName;
  appPackageName: PaymentAppPackageName;
  supportedPGs: PaymentGatewayEnum[];
}

export interface PaymentOptions {
  appName: PaymentAppName;
  displayText?: string;
  imagePath?: string;
  isEnabled: boolean;
  packageName: PaymentAppPackageName;
  paymentGateway: PaymentGatewayEnum;
}
