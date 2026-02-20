// This should be deprecated
export enum PlanTypesEnum {
  ANNUAL = 'Annual',
  BIWEEKLY = 'Biweekly',
  HALF_YEARLY = 'Half Yearly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  TRIAL = 'trial',
  WEEKLY = 'Weekly',
}

export enum PlanCountryEnum {
  GLOBAL = 'GLOBAL',
  IN = 'IN',
}

export enum PlanStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PlanFrequencyEnum {
  ANNUAL = 365,
  BIWEEKLY = 14,
  HALF_YEARLY = 180,
  MONTHLY = 30,
  QUARTERLY = 90,
  WEEKLY = 7,
}

export enum PostSubscriptionFilterEnum {
  CONFIGURED = 'configured',
  NOT_CONFIGURED = 'not_configured',
}
