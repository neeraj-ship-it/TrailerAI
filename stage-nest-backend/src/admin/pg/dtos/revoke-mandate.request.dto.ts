import { Platform } from '@app/common/enums/app.enum';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';

export interface RevokeMandateRequestDto {
  docId: string;
  planId: string;
  platform: Platform;
  userId: string;
  vendor: PaymentGatewayEnum;
}

export interface MandateResponseDto {
  docId: string;
  planId: string;
  platform: Platform;
  userId: string;
  vendor: PaymentGatewayEnum;
}
