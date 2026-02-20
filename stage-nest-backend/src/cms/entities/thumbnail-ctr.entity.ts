import {
  Entity,
  ObjectId,
  PrimaryKey,
  Property,
  Embedded,
  Embeddable,
} from '@mikro-orm/mongodb';

@Embeddable()
export class AirbyteData {
  @Property()
  CLICK_COUNT!: number;

  @Property()
  CONTENT_SLUG!: string;

  @Property()
  CTR!: number;

  @Property()
  THUMBNAIL_PATH!: string;

  @Property()
  VIEW_COUNT!: number;
}

@Entity({ collection: 'airbyte_raw_THUMBNAIL_CTR' })
export class ThumbnailCtr {
  @Embedded(() => AirbyteData, { object: true })
  _airbyte_data!: AirbyteData;

  @Property()
  _airbyte_data_hash!: string;

  @Property()
  _airbyte_emitted_at!: string;

  @PrimaryKey()
  _id: ObjectId = new ObjectId();
}
