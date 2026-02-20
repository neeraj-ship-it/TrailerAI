import {
  Entity,
  EntityRepositoryType,
  OneToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { ApplePayTransactionsRepository } from '../repositories/applePayTransactions.repository';
import { WebhookPayload } from './webhookPayload.entity';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

export enum MandateTransactionStatus {
  FAILED = 'failed',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  SUCCESS = 'success',
}

@Entity({
  repository: () => ApplePayTransactionsRepository,
})
export class ApplePayTransactions extends MongoBaseEntity {
  @Property()
  appAccountToken!: string;

  [EntityRepositoryType]?: ApplePayTransactionsRepository;

  @Property()
  expiresDate?: Date;

  @Property()
  originalTransactionId?: string;

  @Property()
  pgTxnId!: string;

  @Property()
  productId?: string;

  @Property()
  purchaseDate!: Date;

  @OneToOne(() => WebhookPayload, { ref: true })
  rawPayload!: Ref<WebhookPayload>;

  @Property()
  txnAmount!: number;

  @Property()
  txnCurrency!: string;

  @Property()
  userId!: string;
}
