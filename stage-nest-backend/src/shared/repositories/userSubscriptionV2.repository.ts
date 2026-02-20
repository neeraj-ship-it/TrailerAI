import { Injectable, Logger } from '@nestjs/common';

import { Observable } from 'rxjs';

import { addHours } from 'date-fns';

import {
  Cursor,
  EntityManager,
  EntityRepository,
  QueryOrder,
  ObjectId,
} from '@mikro-orm/mongodb';

import {
  addDaysToDate,
  subtractDaysFromDate,
} from '@app/common/helpers/dateTime.helper';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { RECURRING_CONFIG } from '@app/payment/configs/recurring-flow.config';
import {
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from '@app/shared/entities/userSubscriptionV2.entity';

@Injectable()
export class UserSubscriptionV2Repository extends EntityRepository<UserSubscriptionV2> {
  private readonly logger = new Logger(UserSubscriptionV2Repository.name);
  constructor(
    private readonly errorHandlerService: ErrorHandlerService,
    em: EntityManager,
  ) {
    super(em, UserSubscriptionV2);
  }

  findActiveSubscriptionsPastEndDate() {
    return new Observable<UserSubscriptionV2>((subscriber) => {
      const handleError = (error: unknown) => {
        subscriber.error(error);
      };

      const { BATCH_SIZE, BUFFER_DAYS_BEFORE_EXPIRY } =
        RECURRING_CONFIG.USER_SUBSCRIPTION;

      try {
        const fetchData = async () => {
          let hasNext = true;
          let lastCursor: string | null = null;

          while (hasNext) {
            const subscriptions: Cursor<UserSubscriptionV2> = await this.em
              .fork()
              .findByCursor(
                UserSubscriptionV2,
                {
                  endAt: {
                    $lte: addDaysToDate(new Date(), BUFFER_DAYS_BEFORE_EXPIRY),
                  }, // fetch all expired or about to expire subscriptions
                  status: UserSubscriptionStatusV2.ACTIVE,
                },
                {
                  first: BATCH_SIZE,
                  ...(lastCursor ? { after: lastCursor } : {}),
                  orderBy: { createdAt: QueryOrder.DESC },
                },
              );
            subscriptions.items.forEach((item) => subscriber.next(item));
            hasNext = subscriptions.hasNextPage;
            lastCursor = subscriptions.endCursor;
          }
          subscriber.complete();
        };
        fetchData();
      } catch (error) {
        handleError(error);
      }
      return () => this.logger.debug('Unsubscribed from user subscriptions');
    });
  }

  async findLatestUserSubscription({ userId }: { userId: string }) {
    return this.findOne(
      { userId },
      {
        orderBy: { createdAt: QueryOrder.DESC },
        populate: ['mandate'],
      },
    );
  }

  async findLatestUserSubscriptionByMandateId(mandateId: string) {
    return this.findOne(
      { mandate: { id: mandateId } },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );
  }

  findSubscriptionsAboutToExpire({
    batchSize = RECURRING_CONFIG.DEFAULT_BATCH_SIZE,
    expireAt = addHours(new Date(), 72),
  }: {
    batchSize?: number;
    expireAt?: Date;
  }): Observable<UserSubscriptionV2> {
    return new Observable<UserSubscriptionV2>((subscriber) => {
      const handleError = (error: unknown) => {
        subscriber.error(error);
      };
      try {
        const fetchData = async () => {
          let hasNext = true;
          let lastCursor: string | null = null;

          while (hasNext) {
            const resultSet: Cursor<UserSubscriptionV2> =
              await this.findByCursor(
                {
                  endAt: { $lte: expireAt },
                  status: UserSubscriptionStatusV2.ACTIVE,
                },
                {
                  first: batchSize,
                  ...(lastCursor ? { after: lastCursor } : {}),
                  orderBy: { createdAt: QueryOrder.DESC },
                },
              );
            resultSet.items.forEach((item) => subscriber.next(item));
            hasNext = resultSet.hasNextPage;
            lastCursor = resultSet.endCursor;
          }
          subscriber.complete();
        };

        fetchData();
      } catch (error) {
        handleError(error);
      }
      return () =>
        this.logger.debug(
          'Unsubscribed from user subscriptions after completion',
        );
    });
  }

  findSubscriptionsForDebitNotification({
    batchSize = RECURRING_CONFIG.DEFAULT_BATCH_SIZE,
  }: {
    batchSize?: number;
  }): Observable<UserSubscriptionV2> {
    return new Observable<UserSubscriptionV2>((subscriber) => {
      const handleError = (error: unknown) => {
        subscriber.error(error);
      };
      const { BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS, TOTAL_RETRY_DAYS } =
        RECURRING_CONFIG.PRE_DEBIT_NOTIFICATION;

      const fetchData = async () => {
        try {
          let hasNext = true;
          let lastCursor: string | null = null;

          const now = new Date();
          const offsetTime = addDaysToDate(
            now,
            BUFFER_DAYS_BEFORE_SUBSCRIPTION_ENDS,
          );
          const lastRetryTime = subtractDaysFromDate(now, TOTAL_RETRY_DAYS);

          while (hasNext) {
            const resultSet: Cursor<UserSubscriptionV2> =
              await this.getEntityManager()
                .fork()
                .findByCursor(
                  UserSubscriptionV2,
                  {
                    endAt: { $gte: lastRetryTime, $lt: offsetTime },
                    status: {
                      $in: [
                        UserSubscriptionStatusV2.ACTIVE,
                        UserSubscriptionStatusV2.EXPIRED,
                      ],
                    },
                  },
                  {
                    first: batchSize,
                    ...(lastCursor ? { after: lastCursor } : {}),
                    fields: ['*', 'mandate.status'], // Include all fields and mandate.status
                    orderBy: { createdAt: QueryOrder.DESC },
                  },
                );
            resultSet.items.forEach((item) => subscriber.next(item));
            hasNext = resultSet.hasNextPage;
            lastCursor = resultSet.endCursor;
          }
          subscriber.complete();
        } catch (error) {
          handleError(error);
        }
      };
      fetchData();
      return () =>
        this.logger.debug('Finished fetching expired user subscriptions');
    });
  }

  async save(userSubscription: UserSubscriptionV2) {
    return this.em.persistAndFlush(userSubscription);
  }

  async updateUserSubscriptionStatus({
    status,
    userSubscriptionId,
  }: {
    userSubscriptionId: string;
    status: UserSubscriptionStatusV2;
  }) {
    const userSubscription = await this.findOneOrFail(
      { _id: new ObjectId(userSubscriptionId) },
      {
        failHandler: () =>
          Errors.USER_SUBSCRIPTION.NOT_FOUND(userSubscriptionId),
        // fields: ['status'],
      },
    );

    if (userSubscription.status === status) {
      throw Errors.USER_SUBSCRIPTION.UPDATE_FAILED(
        `User subscription status is already ${status}`,
      );
    }
    if (status === UserSubscriptionStatusV2.CANCELLED) {
      throw Errors.USER_SUBSCRIPTION.UPDATE_FAILED(
        `User subscription status cannot be set to ${status} as this subscription is already cancelled`,
      );
    }
    userSubscription.status = status;
    await this.em.persistAndFlush(userSubscription);
  }
}
