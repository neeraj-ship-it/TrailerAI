import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Logger } from '@nestjs/common';

import {
  PaymentQueueKeys,
  PaymentQueuePayload,
} from '../interfaces/paymentQueuePayload.interface';
import { PaymentAlertsService } from '../services/alerts.service';
import { MandateService } from '../services/mandate.service';
import { MandateNotificationService } from '../services/mandateNotification.service';
import { UserSubscriptionV2Service } from '../services/userSubscription.service';
import { QUEUES } from '@app/common/constants/queues.const';

@Processor(QUEUES.PAYMENTS, { concurrency: 100 })
export class PaymentConsumer extends WorkerHost {
  private readonly logger = new Logger(PaymentConsumer.name);
  constructor(
    private readonly paymentAlertsService: PaymentAlertsService,
    private readonly userSubscriptionV2Service: UserSubscriptionV2Service,
    private readonly mandateService: MandateService,
    private readonly mandateNotificationService: MandateNotificationService,
  ) {
    super();
  }

  async process({ data }: Job<PaymentQueuePayload>) {
    const { key } = data;
    this.logger.log(`Processing Payment job:${key}`);
    switch (key) {
      case PaymentQueueKeys.SUBSCRIPTION_RATE_STATUS_CHECK: {
        return this.paymentAlertsService.subscriptionRateHealthCheck();
      }
      case PaymentQueueKeys.TRIAL_RATE_STATUS_CHECK: {
        return this.paymentAlertsService.trialRateHealthCheck();
      }
      case PaymentQueueKeys.TRIGGER_DEBIT_ALERTS: {
        return this.mandateNotificationService.notifyForDebitExecution();
      }
      case PaymentQueueKeys.TRIGGER_DEBIT_EXECUTION: {
        return this.mandateService.sendMandatesForExecution();
      }
      case PaymentQueueKeys.CHECK_USER_SUBSCRIPTION_STATUS: {
        return this.userSubscriptionV2Service.endUserSubscriptionsForExpiredSubscriptionDate();
      }
      case PaymentQueueKeys.DEBIT_NOTIFICATION_CHECK: {
        return this.mandateNotificationService.checkMandateNotificationStatus();
      }
      default: {
        this.logger.warn(`Did not find task processor for ${key}`);
        return;
      }
    }
  }
}
