import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Logger } from '@nestjs/common';

import { Job } from 'bullmq';

import { CMSQueueKeys } from './cms/interfaces/queue-payloads.interface';
import { CmsJobDispatcher } from './cms/services/cms-job-dispatcher.service';
import { ContentQueueKeys } from './content/interfaces/paymentQueuePayload.interface';
import { ContentJobDispatcher } from './content/workers/content-dispatcher.service';
import { PaymentQueueKeys } from './payment/interfaces/paymentQueuePayload.interface';
import { PaymentJobDispatcher } from './payment/workers/payment-dispatcher.service';
import { SCHEDULED_TASKS } from '@app/common/constants/jobs.constant';
import { QUEUES } from '@app/common/constants/queues.const';

type ScheduledJobType = Job<unknown, unknown, SCHEDULED_TASKS>;

@Processor(QUEUES.CRON_JOB_QUEUE, {
  concurrency: 100,
})
export class CronWorker extends WorkerHost {
  private readonly jobHandlerInventory: Record<
    SCHEDULED_TASKS,
    () => Promise<unknown>
  > = {
    [SCHEDULED_TASKS.CHECK_USER_SUBSCRIPTION_STATUS]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.CHECK_USER_SUBSCRIPTION_STATUS,
      );
    },
    [SCHEDULED_TASKS.CMS_CONTENT_PERIPHERAL_ASSET_MONITORING]: () => {
      return this.cmsJobDispatcher.dispatchJob(
        CMSQueueKeys.CMS_CONTENT_PERIPHERAL_ASSET_MONITORING,
      );
    },
    [SCHEDULED_TASKS.REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE]: () => {
      return this.contentJobDispatcher.dispatchJob(
        ContentQueueKeys.REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE,
      );
    },
    [SCHEDULED_TASKS.REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE]: () => {
      return this.contentJobDispatcher.dispatchJob(
        ContentQueueKeys.REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE,
      );
    },
    [SCHEDULED_TASKS.REEL_RECOMMENDATION_STATICAL_DATA_UPDATE]: () => {
      return this.contentJobDispatcher.dispatchJob(
        ContentQueueKeys.REEL_RECOMMENDATION_STATICAL_DATA_UPDATE,
      );
    },
    [SCHEDULED_TASKS.SUBSCRIPTION_RATE_STATUS_CHECK]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.SUBSCRIPTION_RATE_STATUS_CHECK,
      );
    },
    [SCHEDULED_TASKS.TRIAL_RATE_STATUS_CHECK]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.TRIAL_RATE_STATUS_CHECK,
      );
    },
    [SCHEDULED_TASKS.TRIGGER_MANDATE_DEBIT_EXECUTION]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.TRIGGER_DEBIT_EXECUTION,
      );
    },
    [SCHEDULED_TASKS.TRIGGER_MANDATE_DEBIT_NOTIFICATIONS]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.TRIGGER_DEBIT_ALERTS,
      );
    },

    [SCHEDULED_TASKS.TRIGGER_MANDATE_NOTIFICATION_CHECK]: () => {
      return this.paymentJobDispatcher.dispatchJob(
        PaymentQueueKeys.DEBIT_NOTIFICATION_CHECK,
      );
    },
  };

  private readonly logger = new Logger(CronWorker.name);

  constructor(
    private readonly paymentJobDispatcher: PaymentJobDispatcher,
    private readonly contentJobDispatcher: ContentJobDispatcher,
    private readonly cmsJobDispatcher: CmsJobDispatcher,
  ) {
    super();
  }

  async process(job: ScheduledJobType) {
    this.logger.log(`Received cron job ${job.name}`);
    return this.jobHandlerInventory[job.name]();
  }
}
