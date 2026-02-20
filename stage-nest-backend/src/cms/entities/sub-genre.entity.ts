import { Entity, Property } from '@mikro-orm/mongodb';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';

export enum SubGenreStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
@Entity({ collection: 'subgenres' })
export class SubGenre extends MongoBaseEntityWithNumberId {
  @Property()
  genreId!: number;

  @Property()
  hinName!: string;

  @Property()
  image!: string;

  @Property()
  isUsed!: boolean;

  @Property()
  metaDescription!: string;

  @Property()
  metaKeyword!: string;

  @Property()
  metaTitle!: string;

  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property()
  status!: string;
}
