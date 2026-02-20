import { MappedMandateStatus } from '../interfaces/userSubscription.interface';
import { SubscriptionStatusEnum } from 'common/enums/common.enums';

export interface SubscriptionAndMandateStatusResponseDTO {
  mandate_status: MappedMandateStatus;
  subscription_status: SubscriptionStatusEnum;
  subscription_valid?: Date;
  trial_days_elapsed?: number;
}
