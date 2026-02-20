import { Injectable } from '@nestjs/common';

import { EntityRepository } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';

import { ReelAction } from '../entities/reelAction.entity';

@Injectable()
export class ReelActionRepository extends EntityRepository<ReelAction> {
  constructor(em: EntityManager) {
    super(em, ReelAction);
  }
}
