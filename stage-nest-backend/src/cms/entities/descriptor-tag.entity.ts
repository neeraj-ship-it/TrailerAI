import { Entity, Property } from '@mikro-orm/core';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

@Entity({ collection: 'descriptortags' })
export class DescriptorTag extends MongoBaseEntityWithNumberId {
  @Property()
  hindiName!: string;

  @Property()
  name!: string;

  @Property()
  status!: string;
}
