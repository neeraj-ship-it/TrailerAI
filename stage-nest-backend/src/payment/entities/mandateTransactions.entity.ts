import {
  Entity,
  Enum,
  ManyToOne,
  OneToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { MandateRefund } from './mandateRefund.entity';
import { WebhookPayload } from './webhookPayload.entity';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';

export enum MandateTransactionStatus {
  FAILED = 'failed',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  SUCCESS = 'success',
}

@Entity()
export class MandateTransactions extends MongoBaseEntity {
  @ManyToOne(() => MandateV2, { ref: true })
  mandate!: Ref<MandateV2>;

  /**
   * This is not transactionId,
   * this id should be the one through which refund can be done and payment can be captured
   */
  @Property({ nullable: true })
  paymentId!: string | null;

  @Property()
  pgTxnId!: string;

  @OneToOne(() => WebhookPayload, { ref: true })
  rawPayload!: Ref<WebhookPayload>;

  @OneToOne(() => MandateRefund, { ref: true })
  refund!: Ref<MandateRefund> | null;

  @Property()
  txnAmount!: number;

  @Enum(() => MandateTransactionStatus)
  txnStatus!: MandateTransactionStatus;
}
