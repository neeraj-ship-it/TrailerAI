import { EntityRepository, EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { GenreEntity } from '../entities/genres.entity';

@Injectable()
export class GenreRepository extends EntityRepository<GenreEntity> {
  constructor(readonly em: EntityManager) {
    super(em, GenreEntity);
  }
}
