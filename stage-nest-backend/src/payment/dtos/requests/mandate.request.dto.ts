import { PaymentGatewayEnum } from '../../enums/paymentGateway.enums';
import { PaymentApp } from '@app/payment/interfaces/misc.interface';

export interface CreateMandateRequestDTO {
  paymentApp: PaymentApp;
  paymentGateway: PaymentGatewayEnum;
  selectedPlan: string;
}
