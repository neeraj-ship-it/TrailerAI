import {
  ChangeSetType,
  Embeddable,
  Entity,
  EntityRepositoryType,
  Enum,
  EventArgs,
  EventSubscriber,
  JsonType,
  ManyToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { MandateV2Repository } from '../repositories/mandateV2.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { PlanV2 } from 'common/entities/planV2.entity';
import { ClientAppIdEnum, Dialect, OS, Platform } from 'common/enums/app.enum';
import { MasterMandateStatusEnum } from 'common/enums/common.enums';

export enum MandateExecutionStatusEnum {
  FAILED = 'failed',
  PENDING = 'pending',
  SUCCESS = 'success',
}

export class MandateStatusHistory {
  @Enum(() => MasterMandateStatusEnum)
  status!: MasterMandateStatusEnum;

  @Property()
  timestamp!: Date;
}

@Embeddable()
export class Metadata {
  @Enum(() => ClientAppIdEnum)
  appId!: ClientAppIdEnum | null;

  @Enum(() => Dialect)
  dialect!: Dialect;

  @Enum(() => OS)
  os!: OS;

  @Enum(() => Platform)
  platform!: Platform;
}

@Entity({ repository: () => MandateV2Repository })
export class MandateV2 extends MongoBaseEntity {
  @Property()
  creationAmount!: number;

  [EntityRepositoryType]?: MandateV2Repository;

  @Property()
  expiresAt!: Date;

  @Property()
  maxAmount!: number;

  @Property({ type: JsonType })
  metadata!: Metadata;

  @Enum(() => PaymentGatewayEnum)
  pg!: PaymentGatewayEnum;

  @Property()
  pgMandateId!: string | null;

  @ManyToOne(() => PlanV2, { ref: true })
  plan!: Ref<PlanV2>;

  @Property()
  sequenceNumber!: number;

  @Enum(() => MasterMandateStatusEnum)
  status!: MasterMandateStatusEnum;

  @Property({ type: JsonType })
  statusHistory!: MandateStatusHistory[];

  @Property()
  umn!: string | null;

  @Property()
  userId!: string;
}

@Injectable()
export class MandateEntityChangeSubscriber
  implements EventSubscriber<MandateV2>
{
  async beforeUpdate(args: EventArgs<MandateV2>): Promise<void> {
    console.log(
      '✅ MandateEntityChangeSubscriber beforeUpdate triggered!',
      args.changeSet?.payload,
    );
    const { changeSet } = args;

    if (
      !changeSet ||
      changeSet.type !== ChangeSetType.UPDATE ||
      !changeSet?.payload?.status
    ) {
      return;
    }

    const entity = changeSet.entity as MandateV2;
    const newStatus = changeSet.payload.status;

    // Add to status history automatically
    entity.statusHistory.unshift({
      status: newStatus,
      timestamp: new Date(),
    });
  }

  getSubscribedEntities(): string[] {
    return [MandateV2.name];
  }
}
