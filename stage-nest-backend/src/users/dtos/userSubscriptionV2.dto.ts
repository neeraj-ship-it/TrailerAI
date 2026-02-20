import { UserSubscriptionStatusV2 } from '@app/shared/entities/userSubscriptionV2.entity';

export interface GetUserSubscriptionV2StatusResponseDto {
  status: UserSubscriptionStatusV2 | 'no_subscription';
}

export interface GetUserSubscriptionV2DetailsResponseDto {
  endAt: Date;
  startAt: Date;
  status: UserSubscriptionStatusV2;
  trial: TrialSubscriptionDto;
}

interface TrialSubscriptionDto {
  endAt: Date;
  startAt: Date;
}
