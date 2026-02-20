import {
  Entity,
  EntityRepositoryType,
  Property,
  Index,
} from '@mikro-orm/mongodb';

import { ReelActionRepository } from '../repositories/reelAction.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

@Entity({
  repository: () => ReelActionRepository,
})
@Index({ properties: ['reelId', 'userId'] })
@Index({ name: 'reel_idx', properties: ['reelId'] })
@Index({ name: 'user_idx', properties: ['userId'] })
export class ReelAction extends MongoBaseEntity {
  [EntityRepositoryType]?: ReelActionRepository;

  @Property({ default: false })
  liked!: boolean;

  @Property()
  reelId!: string;

  @Property({ default: 0 })
  shareCount!: number;

  @Property()
  userId!: string;

  @Property({ default: 0 })
  viewCount!: number;
}
