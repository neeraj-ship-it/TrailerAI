import { Entity, EntityRepositoryType, Index, Property } from '@mikro-orm/core';

import { MicroDramaInteractionRepository } from '../repositories/microDramaInteraction.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

@Entity({ repository: () => MicroDramaInteractionRepository })
@Index({ properties: ['showSlug', 'userId'] })
export class MicroDramaInteraction extends MongoBaseEntity {
  [EntityRepositoryType]?: MicroDramaInteractionRepository;

  @Property()
  likedContent!: string[]; // episodeSlug

  @Property()
  profileId!: string;

  @Property()
  showSlug!: string;

  @Property()
  userId!: string;
}
