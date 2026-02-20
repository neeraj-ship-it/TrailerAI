import { Entity, Property } from '@mikro-orm/mongodb';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

@Entity({ collection: 'themes' })
export class Theme extends MongoBaseEntityWithNumberId {
  @Property()
  hindiName!: string;

  @Property()
  name!: string;

  @Property()
  status!: string;
}
