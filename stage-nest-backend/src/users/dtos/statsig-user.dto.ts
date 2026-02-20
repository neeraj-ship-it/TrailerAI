export const StatsigUserPropertySchemaName = 'StatsigUserProperty';

export interface StatsigUserProperty {
  paid_subscription_age: number; // days since first paid subscription (ignores trial), -1 if not applicable
  subscription_age: number; // days since lifetime first subscription (trial or paid), -1 if not applicable
  subscription_status: string;
  user_culture: string;
}

// allowed types are string, number, bool for statsig user property
export const STATSIG_USER_PROPERTY_PROTO_SCHEMA = `
syntax = "proto3";
message ${StatsigUserPropertySchemaName} {
  string subscription_status = 1;
  string user_culture = 2;
  int32 subscription_age = 3; 
  int32 paid_subscription_age = 4;
}
`;

export enum StatsigUserPropertySubscriptionStatus {
  NON_TRIAL = 'non_trial',
  SUBSCRIPTION_ACTIVE = 'subscription_active',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  TRIAL_ACTIVE = 'trial_active',
  TRIAL_EXPIRED = 'trial_expired',
}
