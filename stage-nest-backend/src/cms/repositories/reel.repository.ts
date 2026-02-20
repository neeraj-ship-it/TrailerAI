import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { ReelEntity } from '@app/common/entities/reel.entity';

@Injectable()
export class ReelRepository extends EntityRepository<ReelEntity> {
  constructor(readonly em: EntityManager) {
    super(em, ReelEntity);
  }

  async save(reel: ReelEntity) {
    await this.em.persistAndFlush(reel);
    return reel;
  }
}
