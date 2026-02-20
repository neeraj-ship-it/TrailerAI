import {
  Embeddable,
  EntityManager,
  EntityRepositoryType,
  Enum,
  EventArgs,
  EventSubscriber,
  Index,
  JsonType,
  ManyToOne,
  OneToOne,
  Property,
  type Ref,
  Entity,
} from '@mikro-orm/mongodb';

import { Inject, Injectable } from '@nestjs/common';

import { MandateNotificationRepository } from '../repositories/mandateNotification.repository';
import { MandateV2 } from './mandateV2.entity';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { WebhookPayload } from '@app/payment/entities/webhookPayload.entity';

export enum MandateNotificationStatusEnum {
  EXECUTED = 'executed', // self introduced to mark a notification executed
  FAILED = 'failed',
  SENT = 'sent',
  SUCCESS = 'success',
}

@Embeddable()
export class MandateNotificationHistory {
  @Enum(() => MandateNotificationStatusEnum)
  status!: MandateNotificationStatusEnum;

  @Property()
  txnDate!: Date;
}

@Entity({ repository: () => MandateNotificationRepository })
export class MandateNotification extends MongoBaseEntity {
  @Inject()
  private readonly em!: EntityManager;

  [EntityRepositoryType]?: MandateNotificationRepository;

  @ManyToOne(() => MandateV2, { ref: true })
  mandate!: Ref<MandateV2>;

  @Property({ nullable: true })
  pgExecutionId?: string | null;

  @Property()
  @Index()
  pgNotificationId!: string;

  @OneToOne(() => WebhookPayload, { nullable: true, ref: true })
  rawPayload!: Ref<WebhookPayload> | null;

  @Enum(() => MandateNotificationStatusEnum)
  status!: MandateNotificationStatusEnum;

  @Property({ type: JsonType })
  statusHistory!: MandateNotificationHistory[];

  @Property()
  statusUpdatedAt!: Date;
}

@Injectable()
export class MandateNotificationEntityChangeSubscriber
  implements EventSubscriber<MandateNotification>
{
  async beforeUpdate(args: EventArgs<MandateNotification>): Promise<void> {
    console.log(
      '✅ MandateNotificationEntityChangeSubscriber beforeUpdate triggered!',
      args.changeSet?.payload,
    );
    const { changeSet } = args;

    if (!changeSet?.payload?.status) {
      return;
    }

    const entity = changeSet.entity as MandateNotification;
    const newStatus = changeSet.payload.status;

    // Add to status history automatically
    entity.statusHistory.unshift({
      status: newStatus,
      txnDate: new Date(),
    });

    entity.statusUpdatedAt = new Date();
  }

  getSubscribedEntities(): string[] {
    return [MandateNotification.name];
  }
}
