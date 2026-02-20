import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { CombinedPlatter } from 'common/entities/combined-platter.entity';

@Injectable()
export class PlatterRepository extends EntityRepository<CombinedPlatter> {
  constructor(readonly em: EntityManager) {
    super(em, CombinedPlatter);
  }
  async save(platter: CombinedPlatter) {
    await this.em.persistAndFlush(platter);
    return platter;
  }
}
