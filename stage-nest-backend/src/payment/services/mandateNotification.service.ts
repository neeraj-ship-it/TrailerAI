import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { bufferCount, mergeMap } from 'rxjs';

import { EntityManager, QueryOrder } from '@mikro-orm/mongodb';

import { differenceInDays } from 'date-fns';

import { RECURRING_CONFIG } from '../configs/recurring-flow.config';
import { QUEUES } from '@app/common/constants/queues.const';
import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { subtractDaysFromDate } from '@app/common/helpers/dateTime.helper';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import {
  MandateNotification,
  MandateNotificationStatusEnum,
} from '@app/shared/entities/mandateNotification.entity';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import { SubscriptionSource } from '@app/shared/entities/userSubscriptionV2.entity';
import { MandateNotificationRepository } from '@app/shared/repositories/mandateNotification.repository';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';

@Injectable()
export class MandateNotificationService {
  private readonly logger = new Logger(MandateNotificationService.name);

  constructor(
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly mandateNotificationRepository: MandateNotificationRepository,
    private readonly mandateV2Repository: MandateV2Repository,
    @InjectQueue(QUEUES.MANDATE_DEBIT_NOTIFICATIONS)
    private readonly mandateDebitNotificationsQueue: Queue<
      QueuePayload[QUEUES.MANDATE_DEBIT_NOTIFICATIONS]
    >,
    @InjectQueue(QUEUES.MANDATE_NOTIFICATION_CHECK)
    private readonly mandateNotificationCheckQueue: Queue<
      QueuePayload[QUEUES.MANDATE_NOTIFICATION_CHECK]
    >,
    private readonly em: EntityManager,
  ) {}

  async checkMandateNotificationStatus() {
    this.mandateNotificationRepository
      .findStaleNotifications()
      .subscribe(async (mandateNotification) => {
        const mandate = await this.mandateV2Repository
          .getEntityManager()
          .fork()
          .findOne(
            MandateV2,
            {
              _id: mandateNotification.mandate._id,
            },
            {
              // fields: ['pg', 'pgMandateId'],
            },
          );

        if (!mandate) return false;

        this.mandateNotificationCheckQueue.add(
          QUEUES.MANDATE_NOTIFICATION_CHECK,
          {
            pg: mandate.pg,
            pgMandateId: mandate.pgMandateId ?? '',
            pgNotificationId: mandateNotification.pgNotificationId,
          },
          {
            removeOnComplete: 1000,
          },
        );
      });
  }

  /**
   * Forked entity manager are used here because this function is being called by Queue process
   * Queue trigger runs in different process and hence do not inject request context for the mikro-orm
   * Mikro-orm queries will fail if forked em are not used.
   */
  async notifyForDebitExecution() {
    this.logger.debug('Processing subscription expiry notifications');
    let executedNotifications = 0;

    /**
     * This method is used to find the subscriptions that are already expired.
     * We are reaching to notification details through expired subscriptions.
     * Fresh notification and notification retry is happening here.
     */
    this.userSubscriptionV2Repository
      .findSubscriptionsForDebitNotification({
        batchSize: RECURRING_CONFIG.DEFAULT_BATCH_SIZE,
      })
      .pipe(
        mergeMap(async (subscription) => {
          if (
            subscription.subscriptionSource === SubscriptionSource.APPLE_PAY
          ) {
            this.logger.log(
              `Subscription ${subscription.id} subscription source is apple pay. Hence skipping the notification`,
            );
            return false;
          }
          if (!subscription.mandate) {
            this.logger.log(
              `Subscription ${subscription.id} has no mandate. Hence skipping the notification`,
            );
            return false;
          }
          const mandate = subscription.mandate.unwrap();
          const isMandateActive =
            mandate.status === MasterMandateStatusEnum.MANDATE_ACTIVE;

          if (!isMandateActive) {
            return false;
          }

          const {
            BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS,
            DAYS_IN_MONTH,
            RETRY_AFTER_DAYS,
            SECOND_MONTH_FREQUENCY,
            THIRD_MONTH_FREQUENCY,
          } = RECURRING_CONFIG.PRE_DEBIT_NOTIFICATION;

          // TODO: Write a better query for this
          const latestMandateNotification =
            await this.mandateNotificationRepository
              .getEntityManager()
              .fork()
              .findOne(
                MandateNotification,
                {
                  createdAt: {
                    $gt: subtractDaysFromDate(
                      subscription.endAt,
                      BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS,
                    ),
                  },
                  mandate: mandate._id,
                },
                {
                  first: 1, // remove this, not of any use
                  orderBy: {
                    createdAt: QueryOrder.DESC,
                  },
                },
              );

          /**
           * If the mandate notification is not found that means it is a fresh notification.
           * If the mandate notification is failed and the updatedAt is before the cutoff date, we will notify the mandate.
           */
          const eligibleStatuses = [MandateNotificationStatusEnum.FAILED];
          let shouldNotifyMandate =
            !latestMandateNotification ||
            eligibleStatuses.includes(latestMandateNotification.status) ||
            differenceInDays(new Date(), latestMandateNotification.createdAt) >
              RETRY_AFTER_DAYS;

          /**
           * Retry mechanism logic for starting 3 months
           * first month, all the notifications will be considered
           * second month, notifications at 7 day frequency
           * third month, notifications at 15 day frequency
           */
          const daysAfterExpiry = differenceInDays(
            new Date(),
            subscription.endAt,
          );

          if (daysAfterExpiry > 2 * DAYS_IN_MONTH) {
            shouldNotifyMandate =
              (daysAfterExpiry - 2 * DAYS_IN_MONTH) % THIRD_MONTH_FREQUENCY ===
              0;
          } else if (daysAfterExpiry > DAYS_IN_MONTH) {
            shouldNotifyMandate =
              (daysAfterExpiry - DAYS_IN_MONTH) % SECOND_MONTH_FREQUENCY === 0;
          }

          if (!shouldNotifyMandate) {
            return false;
          }

          this.mandateDebitNotificationsQueue.add(
            QUEUES.MANDATE_DEBIT_NOTIFICATIONS,
            {
              endAt: subscription.endAt,
              mandateId: subscription.mandate.id,
              planId: subscription.plan.id,
              startAt: subscription.startAt,
              subscriptionId: subscription.id,
              userId: subscription.userId.toString(),
            },
            {
              removeOnComplete: 1000,
            },
          );
          return true;
        }, 100),
      ) // creating a internal batch of 100
      .pipe(bufferCount(100)) // to create batches of 100 and log the results.
      .subscribe((successList) => {
        successList.forEach((success) => {
          if (success) {
            executedNotifications += 1;
          }
        });
        this.logger.log(
          `notification debit trigger for batch size:${executedNotifications}`,
        );
        executedNotifications = 0;
      });
  }
}
