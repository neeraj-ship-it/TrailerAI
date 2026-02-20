export interface GetUserSubscriptionResponseDto {
  isGlobal?: boolean;
  isTrial: boolean;
  mandateStatus?: string;
  subscriptionExpiry: Date;
  subscriptionStart: Date;
  subscriptionStatus: number;
  userId: string;
}
