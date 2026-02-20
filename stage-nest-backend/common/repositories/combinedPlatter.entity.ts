import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { CombinedPlatter } from 'common/entities/combined-platter.entity';

@Injectable()
export class CombinedPlatterRepository extends EntityRepository<CombinedPlatter> {
  constructor(em: EntityManager) {
    super(em, CombinedPlatter);
  }
  persistAndFlush(entity: CombinedPlatter) {
    this.em.persistAndFlush(entity);
  }
}
