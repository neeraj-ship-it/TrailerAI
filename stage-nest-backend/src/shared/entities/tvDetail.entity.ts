import { Entity, EntityRepositoryType, Property } from '@mikro-orm/mongodb';

import { TvDetailRepository } from '../repositories/tvDetail.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

@Entity({
  collection: 'tvdetails',
  repository: () => TvDetailRepository,
})
export class TvDetail extends MongoBaseEntity {
  [EntityRepositoryType]?: TvDetailRepository;

  @Property({ default: false })
  isLogin!: boolean;

  @Property({ type: Object })
  subscriptionDetails?: object;

  @Property({ nullable: true })
  subscriptionStatus?: number;

  @Property()
  tvDeviceId!: string;

  @Property({ nullable: true })
  tvLoginCode?: number;

  @Property({ type: Object })
  userDetails?: object;

  @Property()
  userId!: string;
}
