import { EntityRepository } from '@mikro-orm/mongodb';
import { EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { Mood } from '../entities/moods.entity';

@Injectable()
export class MoodRepository extends EntityRepository<Mood> {
  constructor(readonly em: EntityManager) {
    super(em, Mood);
  }
}
