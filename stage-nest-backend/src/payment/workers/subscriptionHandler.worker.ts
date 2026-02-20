import { WorkerHost } from '@nestjs/bullmq';

import { Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Inject, Logger } from '@nestjs/common';

import { addMinutes, isBefore } from 'date-fns';

import { ObjectId } from '@mikro-orm/mongodb';

import { QUEUES } from '@app/common/constants/queues.const';
import { PlanV2 } from '@app/common/entities/planV2.entity';
import { ClientAppIdEnum, OS } from '@app/common/enums/app.enum';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import { Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import { Events } from '@app/events/interfaces/events.interface';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import {
  SubscriptionSource,
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from '@app/shared/entities/userSubscriptionV2.entity';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';

@Processor(QUEUES.SUBSCRIPTION_CHECK, {
  concurrency: 100,
})
export class SubscriptionCheckWorker extends WorkerHost {
  private logger = new Logger(SubscriptionCheckWorker.name);

  constructor(
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly mandateV2Repository: MandateV2Repository,
    @Inject() private eventsService: EventService,
  ) {
    super();
  }

  private getEventData(
    subscription: UserSubscriptionV2,
    plan: PlanV2,
    trialPeriodActive: boolean,
    subscriptionId: string,
    mandate?: MandateV2,
  ) {
    const basePayload = {
      plan_id: trialPeriodActive ? plan.trialPlanId : plan.name,
      subscription_id: subscriptionId,
      timestamp: new Date(),
    };

    if (
      subscription.subscriptionSource === SubscriptionSource.MANDATE &&
      mandate
    ) {
      return {
        app_client_id: mandate.metadata.appId,
        os: mandate.metadata.os,
        payload: basePayload,
      };
    }

    if (subscription.subscriptionSource === SubscriptionSource.APPLE_PAY) {
      return {
        app_client_id: ClientAppIdEnum.IOS_MAIN,
        os: OS.IOS,
        payload: basePayload,
      };
    }

    throw new Error(
      `Unhandled subscription source: ${subscription.subscriptionSource}`,
    );
  }

  private async handleSubscriptionExpiry(subscriptionId: string) {
    // check if the user subscription payment arrived
    const subscription = await this.userSubscriptionV2Repository
      .getEntityManager()
      .fork()
      .findOneOrFail(
        UserSubscriptionV2,
        {
          _id: new ObjectId(subscriptionId),
        },
        {
          failHandler: () => {
            const msg = `User subscription not found for subscriptionId:${subscriptionId}`;
            this.logger.error(msg);
            return Errors.USER_SUBSCRIPTION.NOT_FOUND(msg);
          },
        },
      );

    const bufferTime = addMinutes(new Date(), 1);
    if (!isBefore(subscription.endAt, bufferTime)) {
      this.logger.log(
        `Subscription extended for subscriptionId:${subscriptionId}`,
      );
      return;
    }

    const trialPeriodActive = isBefore(new Date(), subscription.trial.endAt);
    const plan = subscription.plan.unwrap();
    subscription.status = UserSubscriptionStatusV2.EXPIRED;

    await this.userSubscriptionV2Repository
      .getEntityManager()
      .fork()
      .persistAndFlush(subscription);

    // Subscription through mandate need send event from here
    if (
      subscription.subscriptionSource === SubscriptionSource.MANDATE &&
      subscription.mandate
    ) {
      const mandate = await this.mandateV2Repository
        .getEntityManager()
        .fork()
        .findOneOrFail(
          MandateV2,
          {
            _id: subscription.mandate._id,
          },
          {
            failHandler: () => {
              const msg = `Mandate not found for mandateId:${subscription.mandate?._id.toString()}`;
              this.logger.error(msg);
              return Errors.MANDATE.NOT_FOUND(msg);
            },
          },
        );

      const eventData = this.getEventData(
        subscription,
        plan,
        trialPeriodActive,
        subscriptionId,
        mandate,
      );
      this.eventsService.trackEvent({
        ...eventData,
        key: Events.SUBSCRIPTION_EXPIRED,
        user_id: subscription.userId,
      });
    }

    // Subscription through apple pay need send event from here
    if (subscription.subscriptionSource === SubscriptionSource.APPLE_PAY) {
      const eventData = this.getEventData(
        subscription,
        plan,
        trialPeriodActive,
        subscriptionId,
      );
      this.eventsService.trackEvent({
        ...eventData,
        key: Events.SUBSCRIPTION_EXPIRED,
        user_id: subscription.userId,
      });
    }
  }

  async process(job: Job<QueuePayload[QUEUES.SUBSCRIPTION_CHECK]>) {
    this.logger.log(
      `Processing queue:${QUEUES.SUBSCRIPTION_CHECK} job:${job.id}`,
    );
    return this.handleSubscriptionExpiry(job.data.subscriptionId);
  }
}
