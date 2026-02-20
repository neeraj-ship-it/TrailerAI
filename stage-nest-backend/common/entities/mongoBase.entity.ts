import {
  BaseEntity,
  ObjectId,
  OptionalProps,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/mongodb';

export type DefaultOptionalProps = 'createdAt' | 'updatedAt' | 'id';

export class MongoBaseEntity extends BaseEntity {
  @PrimaryKey()
  _id: ObjectId = new ObjectId();

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @SerializedPrimaryKey()
  id!: string;

  [OptionalProps]?: DefaultOptionalProps;

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt!: Date;
}

export class MongoBaseEntityWithNumberId extends BaseEntity {
  @PrimaryKey()
  _id!: number;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @SerializedPrimaryKey()
  id!: string | number;

  [OptionalProps]?: DefaultOptionalProps;

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt!: Date;
}
