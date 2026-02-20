export enum SetuMandateAmountRule {
  EXACT = 'exact',
  MAX = 'max',
}

export enum SetuMandateRecurrenceFrequency {
  AS_PRESENTED = 'as presented',
  BI_MONTHLY = 'bi monthly',
  DAILY = 'daily',
  FORTNIGHTLY = 'fortnightly',
  HALF_YEARLY = 'half yearly',
  MONTHLY = 'monthly',
  ONE_TIME = 'one time',
  QUARTERLY = 'quarterly',
  WEEKLY = 'weekly',
  YEARLY = 'yearly',
}

export enum SetuMandateRecurrenceFrequencyRule {
  AFTER_DATE = 'after',
  BEFORE_DATE = 'before',
  ON_DATE = 'on',
}

export enum SetuMandateInitiationMode {
  INTENT = '04',
  QR = '01',
}

export enum SetuMandateCreationMode {
  COLLECT = 'collect',
  INTENT = 'intent',
  QR = 'qr',
}
