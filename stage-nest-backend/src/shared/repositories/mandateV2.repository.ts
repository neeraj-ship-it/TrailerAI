import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { MandateV2 } from '../entities/mandateV2.entity';

@Injectable()
export class MandateV2Repository extends EntityRepository<MandateV2> {
  constructor(readonly em: EntityManager) {
    super(em, MandateV2);
  }

  async save(mandate: MandateV2) {
    return this.em.persistAndFlush(mandate);
  }
}
