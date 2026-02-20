import { SlackNotificationKeys } from '../../../notification/interfaces/notificationKeys.interface';

export const SlackTemplates: Record<
  SlackNotificationKeys,
  (date: Date) => string
> = {
  [SlackNotificationKeys.PRE_DEBIT_NOTIFICATION_CRON_TRIGGER]: (date: Date) =>
    `The pre-debit cron has triggered on ${date.toISOString()}`,
};
