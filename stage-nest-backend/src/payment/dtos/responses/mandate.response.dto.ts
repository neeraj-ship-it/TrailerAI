import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { MandateTransactionStatus } from '@app/payment/entities/mandateTransactions.entity';

export interface CreateMandateResponseDTO {
  upiIntentLink: string;
}

export interface ToggleMandateStatusResponseDTO {
  status: MasterMandateStatusEnum;
}

export interface GetMandateLatestTransactionStatusResponseDTO {
  txnId?: string;
  txnStatus: MandateTransactionStatus;
}

export interface MandateStatusResponseDTO {
  status: MasterMandateStatusEnum;
}
