import { EntityRepository } from '@mikro-orm/mongodb';
import { EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { SubGenre } from '../entities/sub-genre.entity';

@Injectable()
export class SubGenreRepository extends EntityRepository<SubGenre> {
  constructor(readonly em: EntityManager) {
    super(em, SubGenre);
  }
}
