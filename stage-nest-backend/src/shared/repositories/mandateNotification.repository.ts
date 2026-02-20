import {
  Cursor,
  EntityManager,
  EntityRepository,
  QueryOrder,
} from '@mikro-orm/mongodb';

import { Injectable, Logger } from '@nestjs/common';

import { Observable } from 'rxjs';

import {
  MandateNotification,
  MandateNotificationStatusEnum,
} from '../entities/mandateNotification.entity';
import { subtractDaysFromDate } from '@app/common/helpers/dateTime.helper';
import { RECURRING_CONFIG } from '@app/payment/configs/recurring-flow.config';

@Injectable()
export class MandateNotificationRepository extends EntityRepository<MandateNotification> {
  private readonly logger = new Logger(MandateNotificationRepository.name);
  constructor(readonly em: EntityManager) {
    super(em, MandateNotification);
  }
  /**
   * Be careful while modifying this method. This method will impact the debit execution. Hence revenue impact.
   */
  findNotificationsReadyForExecution() {
    return new Observable<MandateNotification>((subscriber) => {
      const handleError = (error: unknown) => {
        subscriber.error(error);
      };
      const {
        BATCH_SIZE,
        NOTIFICATION_CUTOFF_DAYS_LB,
        NOTIFICATION_CUTOFF_DAYS_UB,
      } = RECURRING_CONFIG.DEBIT_EXECUTION;

      // only notifications that are created within last NOTIFICATION_CUTOFF_DAYS_LB -> NOTIFICATION_CUTOFF_DAYS_UB days and been in success state for more than 1 day(24hrs) are eligible for mandate debit execution
      const NOTIFICATION_CUTOFF_DATE_UB = subtractDaysFromDate(
        new Date(),
        NOTIFICATION_CUTOFF_DAYS_UB,
      );
      const NOTIFICATION_CUTOFF_DATE_LB = subtractDaysFromDate(
        new Date(),
        NOTIFICATION_CUTOFF_DAYS_LB,
      );
      const fetchData = async () => {
        try {
          let hasNext = true;
          let lastCursor: string | null = null;

          while (hasNext) {
            const mandateNotifications: Cursor<MandateNotification> =
              await this.em.fork().findByCursor(
                MandateNotification,
                {
                  /**
                   * TODO: This is a temporary solution to get the notifications that are ready for execution.
                   * We should query inside the array of statusHistory
                   */
                  createdAt: {
                    $gte: NOTIFICATION_CUTOFF_DATE_LB,
                    $lt: NOTIFICATION_CUTOFF_DATE_UB,
                  },
                  status: MandateNotificationStatusEnum.SUCCESS,
                },
                {
                  first: BATCH_SIZE,
                  ...(lastCursor ? { after: lastCursor } : {}),
                  orderBy: { updatedAt: QueryOrder.DESC },
                },
              );
            mandateNotifications.items.forEach((item) => subscriber.next(item));
            hasNext = mandateNotifications.hasNextPage;
            lastCursor = mandateNotifications.endCursor;
          }
          subscriber.complete();
        } catch (error) {
          handleError(error);
        }
      };
      fetchData();
      return () => this.logger.debug('Mandate notifications fetched');
    });
  }

  findStaleNotifications() {
    return new Observable<MandateNotification>((subscriber) => {
      const handleError = (error: unknown) => {
        subscriber.error(error);
      };

      const { STALE_BATCH_SIZE, STALE_NOTIFICATION_DAYS } =
        RECURRING_CONFIG.PRE_DEBIT_NOTIFICATION;

      try {
        const fetchData = async () => {
          const mandateNotifications: Cursor<MandateNotification> =
            await this.em.fork().findByCursor(
              MandateNotification,
              {
                createdAt: {
                  $lt: subtractDaysFromDate(
                    new Date(),
                    STALE_NOTIFICATION_DAYS,
                  ),
                },
                status: MandateNotificationStatusEnum.SENT,
              },
              {
                first: STALE_BATCH_SIZE,
                orderBy: { createdAt: QueryOrder.DESC },
              },
            );
          mandateNotifications.items.forEach((item) => subscriber.next(item));
          subscriber.complete();
        };
        fetchData();
      } catch (error) {
        handleError(error);
      }
      return () => this.logger.debug('Stale mandate notifications fetched');
    });
  }

  async save(mandateNotification: MandateNotification) {
    return this.em.persistAndFlush(mandateNotification);
  }
}
