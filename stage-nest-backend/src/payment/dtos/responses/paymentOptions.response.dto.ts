import { PaymentGatewayEnum } from '../../enums/paymentGateway.enums';
import {
  PaymentAppName,
  PaymentAppPackageName,
  PaymentAppShortName,
  PaymentGatewayShortName,
} from '@app/common/entities/setting.entity';
import { PaymentOptionsGroupName } from 'src/users/dtos/experiment.dto';

export interface PaymentOptionResponseDto {
  appName: PaymentAppName;
  appShortName: PaymentAppShortName;
  displayText?: string;
  imagePath: string;
  packageName: PaymentAppPackageName;
  paymentFailurePopupDelay: number;
  paymentGateway: PaymentGatewayEnum;
  pgShortName: PaymentGatewayShortName;
}

export interface PaymentOptionsRequestDTO {
  packageNames: string[];
}

export type PaymentOptionsResponseDTO = PaymentOptionResponseDto[];

export interface PaymentOptionsResponseV2DTO {
  groupName: PaymentOptionsGroupName;
  paymentOptions: PaymentOptionResponseDto[];
}
