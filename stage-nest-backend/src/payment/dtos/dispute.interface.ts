import { DisputeStatusEnum } from '../enums/dispute.enums';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';

export interface IDispute {
  amount: number;
  disputeDeadlineTime: Date;
  disputeId: string;
  disputeTime: Date;
  errorMessage?: string;
  payload: object;
  paymentGateway: PaymentGatewayEnum;
  paymentId: string;
  pgDocumentId: string;
  status: DisputeStatusEnum;
}

export interface IUpdateDispute {
  status: DisputeStatusEnum;
}
