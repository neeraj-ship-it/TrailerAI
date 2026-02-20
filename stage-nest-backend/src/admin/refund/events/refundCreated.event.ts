import { Types } from 'mongoose';

export class RefundCreatedEvent {
  reason!: string;
  refundAmount!: number;
  refundInitiatedByUserName!: string;
  refundStatus!: string;
  refundStatusHistory!: string;
  subscriptionId!: string;
  user!: Types.ObjectId;
  vendor!: string;
}
