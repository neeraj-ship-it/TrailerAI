import { RefundedByEnum } from '../enums/refundedBy.enum';
import { RecurringRefundStatus } from '@app/common/enums/common.enums';

export interface RefundStatusHistory {
  refundStatus: string;
  time: Date;
}

export interface ICreateRefund {
  pgTransactionId: string;
  reason?: string;
  refundAmount: number;
  refundedBy: RefundedByEnum;
  refundInitiatedBy?: string;
  refundInitiatedByUserName?: string;
  refundStatus: RecurringRefundStatus;
  refundStatusHistory?: RefundStatusHistory[];
  refundTransactionId: string;
  subscriptionId: string;
  user: string;
  vendor: string;
}
