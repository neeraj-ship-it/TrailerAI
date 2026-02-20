import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { UpcomingSectionEntity } from 'common/entities/upcoming-section-v2.entity';

@Injectable()
export class UpcomingSectionRepository extends EntityRepository<UpcomingSectionEntity> {
  constructor(readonly em: EntityManager) {
    super(em, UpcomingSectionEntity);
  }

  async save(entity: UpcomingSectionEntity) {
    await this.em.persistAndFlush(entity);
    return entity;
  }
}
