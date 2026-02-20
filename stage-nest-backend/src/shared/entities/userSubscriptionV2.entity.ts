import {
  ChangeSetType,
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  Enum,
  EventArgs,
  EventSubscriber,
  JsonType,
  ManyToOne,
  ObjectId,
  OneToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { UserSubscriptionV2Repository } from '../repositories/userSubscriptionV2.repository';
import { MandateV2 } from './mandateV2.entity';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { PlanV2 } from 'common/entities/planV2.entity';
import { NcantoUtils } from 'common/utils/ncanto.utils';

export enum UserSubscriptionStatusV1 {
  ACTIVE = 1,
  EXPIRED = 2,
  UNSUBSCRIBED = 0,
}
export enum UserSubscriptionStatusV2 {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum SubscriptionSource {
  APPLE_PAY = 'apple_pay',
  MANDATE = 'mandate',
}

@Embeddable()
export class TrialSubscription {
  @Property()
  endAt!: Date;

  @Property()
  startAt!: Date;
}

@Embeddable()
export class SubscriptionHistory {
  @Property({ nullable: true })
  endAt?: Date;

  @Enum(() => UserSubscriptionStatusV2)
  status!: UserSubscriptionStatusV2;

  @Enum(() => SubscriptionSource)
  subscriptionSource?: SubscriptionSource;

  @Property()
  triggerDate!: Date;

  @Property()
  txn?: string | null;
}

@Entity({ repository: () => UserSubscriptionV2Repository })
export class UserSubscriptionV2 extends MongoBaseEntity {
  @Property()
  endAt!: Date;

  [EntityRepositoryType]?: UserSubscriptionV2Repository;

  @Property()
  lastTxn!: ObjectId;

  @OneToOne(() => MandateV2, { nullable: true, ref: true })
  mandate: Ref<MandateV2> | null = null;

  @ManyToOne(() => PlanV2, { ref: true })
  plan!: Ref<PlanV2>;

  @Property()
  startAt!: Date;

  @Enum({ items: () => UserSubscriptionStatusV2 })
  status!: UserSubscriptionStatusV2;

  @Property({ type: JsonType })
  subscriptionHistory!: SubscriptionHistory[];

  @Enum(() => SubscriptionSource)
  subscriptionSource?: SubscriptionSource;

  @Embedded(() => TrialSubscription)
  trial!: TrialSubscription;

  @Property({ unique: true })
  userId!: string;
}

@Injectable()
export class UserSubscriptionEntityChangeSubscriber
  implements EventSubscriber<UserSubscriptionV2>
{
  constructor(private readonly ncantoUtils: NcantoUtils) {}

  async beforeUpdate(args: EventArgs<UserSubscriptionV2>): Promise<void> {
    console.log(
      '✅ UserSubscriptionEntityChangeSubscriber beforeUpdate triggered!',
      args.changeSet?.payload,
    );
    const { changeSet } = args;
    if (!changeSet) return;
    const entity = changeSet.entity as UserSubscriptionV2;
    const newStatus = changeSet?.payload?.status ?? changeSet.entity.status;
    const subscriptionSource =
      changeSet?.payload?.subscriptionSource ??
      changeSet.entity.subscriptionSource;
    const newEndAt = changeSet.payload.endAt;
    const lastTxn = changeSet.payload?.lastTxn;

    const endAt =
      newEndAt == null || newEndAt == undefined
        ? changeSet.entity.endAt
        : newEndAt instanceof Date
          ? newEndAt
          : new Date(newEndAt);

    // Call ncantoUtils to create/update subscriber
    // this.ncantoUtils.createOrUpdateSubscriber(
    //   entity.userId,
    //   endAt,
    //   false, // inhouse
    //   // `${entity.userId}_default`, // profileId
    //   // 'default', // profileName
    // );

    if (changeSet.type !== ChangeSetType.UPDATE) return;

    // Add to status history automatically
    entity.subscriptionHistory.unshift({
      endAt,
      status: newStatus,
      subscriptionSource,
      triggerDate: new Date(),
      txn: lastTxn != null ? lastTxn.toString() : null,
    });
  }

  getSubscribedEntities(): string[] {
    return [UserSubscriptionV2.name];
  }
}
