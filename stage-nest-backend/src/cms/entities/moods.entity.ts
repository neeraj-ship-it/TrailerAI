import { Entity, Property } from '@mikro-orm/core';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

@Entity({ collection: 'moods' })
export class Mood extends MongoBaseEntityWithNumberId {
  @Property()
  hindiName!: string;

  @Property()
  name!: string;

  @Property()
  status!: string;
}
