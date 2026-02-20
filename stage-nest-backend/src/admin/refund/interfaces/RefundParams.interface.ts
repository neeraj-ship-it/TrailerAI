import { Types } from 'mongoose';

export interface RefundParams {
  juspayOrderId: string;
  mandateOrderId?: string;
  masterMandateId: string;
  order: Types.ObjectId;
  payingPrice: number;
  reason: string;
  refundInitiatedBy: string;
  transactionId: string;
  userId: string;
}
