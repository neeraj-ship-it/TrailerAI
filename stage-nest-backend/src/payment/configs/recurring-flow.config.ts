export const RECURRING_CONFIG = {
  DEBIT_EXECUTION: {
    BATCH_SIZE: 1000, // batch size for debit exections
    NOTIFICATION_CUTOFF_DAYS_LB: 3, // lower bound of past days from now that will be considered for debit execution (TODO: check max value for this)
    NOTIFICATION_CUTOFF_DAYS_UB: 1, // upper bound of past days from now that will be considered for debit execution, should be greater than 1 (24 hours min limit for gap b/w pre-debit notification & exection)
  },
  DEFAULT_BATCH_SIZE: 1000,
  PRE_DEBIT_NOTIFICATION: {
    BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS: 2, // all user subscriptions b/w now -> BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS will be eligible for pre-debit notification
    DAYS_IN_MONTH: 30,
    RETRY_AFTER_DAYS: 2, // if no payment within 2 days & mandate active, then retry after these many days
    SECOND_MONTH_FREQUENCY: 7, // should trigger every 7 days
    STALE_BATCH_SIZE: 500,
    STALE_NOTIFICATION_DAYS: 10, // days after which we should start status check for pre-debit notifications
    THIRD_MONTH_FREQUENCY: 15, // should trigger every 15 days
    TOTAL_RETRY_DAYS: 90,
  },
  USER_SUBSCRIPTION: {
    BATCH_SIZE: 1000, // batch size for user subscription expiry processing
    BUFFER_DAYS_BEFORE_EXPIRY: 1, // all user subscriptions from now -> BUFFER_DAYS_BEFORE_EXPIRY will be added for expiry to queue
  },
};
