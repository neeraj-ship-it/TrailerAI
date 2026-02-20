import { PaymentOptionsEnum } from '../enums/paymentOption.enum';
import { PaymentAppName } from '@app/common/entities/setting.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export interface UpdatePGConfigRequestDTO {
  changes: UpdatePGConfig[];
}

export interface UpdatePGConfig {
  newOrder: number[]; // empty array means no change
  paymentOption: PaymentOptionsEnum;
  valueChanges: ConfigUpdateValues[];
}

export interface ConfigUpdateValues {
  appName: PaymentAppName;
  isEnabled?: boolean;
  isRecommended?: boolean;
  paymentGateway?: PaymentGatewayEnum;
}
