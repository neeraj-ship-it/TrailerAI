import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { ContentProfile } from '../entities/contentProfile.entity';

@Injectable()
export class ContentProfileRepository extends EntityRepository<ContentProfile> {
  constructor(readonly em: EntityManager) {
    super(em, ContentProfile);
  }

  async save(contentProfile: ContentProfile) {
    return this.em.persistAndFlush(contentProfile);
  }
}
