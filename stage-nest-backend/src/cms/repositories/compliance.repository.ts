import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { ComplianceEntity } from '../entities/compliance.entity';

@Injectable()
export class ComplianceRepository extends EntityRepository<ComplianceEntity> {
  constructor(readonly em: EntityManager) {
    super(em, ComplianceEntity);
  }

  async save(compliance: ComplianceEntity) {
    return this.em.persistAndFlush(compliance);
  }
}
