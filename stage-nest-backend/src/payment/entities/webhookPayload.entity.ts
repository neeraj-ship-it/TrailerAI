import {
  Entity,
  EntityRepositoryType,
  Enum,
  JsonType,
  Property,
} from '@mikro-orm/mongodb';

import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { WebhookPayloadRepository } from '../repositories/webhookPayload.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

@Entity({ repository: () => WebhookPayloadRepository })
export class WebhookPayload extends MongoBaseEntity {
  [EntityRepositoryType]?: WebhookPayloadRepository;

  @Property()
  operation!: string;

  @Enum(() => PaymentGatewayEnum)
  pg!: PaymentGatewayEnum;

  @Property({ type: JsonType })
  rawPayload!: Record<string, unknown>;
}
