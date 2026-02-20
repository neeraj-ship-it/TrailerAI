import { Entity, Property, Enum, Index } from '@mikro-orm/mongodb';

import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

import { LanguageVariantProperty } from '@app/common/schema/localizedString.schema';

export enum ArtistStatusEnum {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

@Entity()
@Index({ properties: ['name'], type: 'fulltext' })
export class ArtistV2 extends MongoBaseEntity {
  @Property()
  description!: LanguageVariantProperty;

  @Property()
  image!: string;

  @Property()
  name!: LanguageVariantProperty;

  @Property()
  slug!: string;

  @Enum(() => ArtistStatusEnum)
  status!: ArtistStatusEnum;
}
