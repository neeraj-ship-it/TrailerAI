import { SubscriptionStatusEnum } from '@app/common/enums/common.enums';
import { MappedMandateStatus } from 'src/users/interfaces/userSubscription.interface';

interface RefundStatusHistory {
  refundStatus: string;
  time: Date;
}

interface UserSubscriptionsTransaction {
  createdAt: Date;
  isRefundable: boolean;
  mandateStatus?: MappedMandateStatus;
  nextPlanDays?: string;
  nextPlanPayingPrice?: number;
  nonRefundableReason?: string;
  payingPrice: number;
  planDays: string;
  refundAmount?: number;
  refundCreatedAt?: Date;
  refundInitiatedByUserName?: string;
  refundReason?: string;
  refundStatus?: string;
  refundStatusHistory?: RefundStatusHistory[];
  refundTransactionId?: string;
  refundVendor?: string;
  subscriptionDate: Date;
  subscriptionId: string;
  subscriptionStatus?: SubscriptionStatusEnum;
  subscriptionValid: Date;

  vendor: string;
}

export interface UserSubscriptionsResponseDto {
  transactions: UserSubscriptionsTransaction[];
}
