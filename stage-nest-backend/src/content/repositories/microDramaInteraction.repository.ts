import { Injectable } from '@nestjs/common';

import { EntityRepository } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';

import { MicroDramaInteraction } from '../entities/microDramaInteraction.entity';

@Injectable()
export class MicroDramaInteractionRepository extends EntityRepository<MicroDramaInteraction> {
  constructor(em: EntityManager) {
    super(em, MicroDramaInteraction);
  }
}
