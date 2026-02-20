import { Injectable } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { differenceInMilliseconds } from 'date-fns';

import { QUEUES } from '@app/common/constants/queues.const';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';

@Injectable()
export class UserSubscriptionV2Service {
  constructor(
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    @InjectQueue(QUEUES.SUBSCRIPTION_CHECK)
    private readonly subscriptionCheckQueue: Queue<
      QueuePayload[QUEUES.SUBSCRIPTION_CHECK]
    >,
  ) {}

  async endUserSubscriptionsForExpiredSubscriptionDate() {
    return this.userSubscriptionV2Repository
      .findActiveSubscriptionsPastEndDate()
      .subscribe((subscription) => {
        this.subscriptionCheckQueue.add(
          QUEUES.SUBSCRIPTION_CHECK,
          {
            subscriptionId: subscription.id,
          },
          {
            delay: differenceInMilliseconds(subscription.endAt, new Date()),
            removeOnComplete: 1000,
          },
        );
      });
  }
}
