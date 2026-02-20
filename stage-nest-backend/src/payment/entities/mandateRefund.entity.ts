import {
  ChangeSetType,
  Entity,
  Enum,
  EventArgs,
  EventSubscriber,
  JsonType,
  OneToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { MandateRefundRepository } from '../repositories/mandateRefund.repository';
import { MandateTransactions } from './mandateTransactions.entity';
import { WebhookPayload } from './webhookPayload.entity';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

export enum RefundStatus {
  REFUND_FAILED = 'refund_failed',
  REFUND_PENDING = 'refund_pending',
  REFUND_SUCCESS = 'refund_success',
}

export enum RefundInitiatedBy {
  AGENT = 'agent',
  SYSTEM = 'system',
  USER = 'user',
}

export class RefundStatusHistory {
  @Enum(() => RefundStatus)
  status!: RefundStatus;

  @Property()
  timestamp!: Date;
}

@Entity({ repository: () => MandateRefundRepository })
export class MandateRefund extends MongoBaseEntity {
  @Property()
  amount!: number;

  @Enum(() => RefundInitiatedBy)
  initiator!: RefundInitiatedBy;

  @OneToOne(() => MandateTransactions, { ref: true })
  mandateTxn!: Ref<MandateTransactions>;

  @OneToOne(() => WebhookPayload, { nullable: true, ref: true })
  rawPayload!: Ref<WebhookPayload> | null;

  @Property()
  reason!: string;

  @Enum(() => RefundInitiatedBy)
  refundedBy!: RefundInitiatedBy;

  @Property()
  refundTxnId!: string;

  @Enum(() => RefundStatus)
  status!: RefundStatus;

  @Property({ type: JsonType })
  statusHistory!: RefundStatusHistory[];

  @Property()
  user!: string;
}

@Injectable()
export class MandateRefundEntityChangeSubscriber
  implements EventSubscriber<MandateRefund>
{
  async beforeUpdate(args: EventArgs<MandateRefund>): Promise<void> {
    const { changeSet } = args;

    if (
      !changeSet ||
      changeSet.type !== ChangeSetType.UPDATE ||
      !changeSet?.payload?.status
    ) {
      return;
    }

    const entity = changeSet.entity as MandateRefund;
    const newStatus = changeSet.payload.status;

    // Add to status history automatically
    entity.statusHistory.unshift({
      status: newStatus,
      timestamp: new Date(),
    });
  }

  getSubscribedEntities(): string[] {
    return [MandateRefund.name];
  }
}
