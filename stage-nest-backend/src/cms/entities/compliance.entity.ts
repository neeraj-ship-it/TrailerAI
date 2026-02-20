import { Entity, Property } from '@mikro-orm/mongodb';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

@Entity({ collection: 'complaines' })
export class ComplianceEntity extends MongoBaseEntityWithNumberId {
  @Property()
  hindiName!: string;

  @Property()
  language!: string;

  @Property()
  name!: string;

  @Property()
  order!: number;

  @Property()
  slug!: string;

  @Property()
  status!: string;
}
