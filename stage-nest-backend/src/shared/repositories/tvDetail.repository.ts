import { Injectable } from '@nestjs/common';

import { EntityRepository } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';

import { TvDetail } from '../entities/tvDetail.entity';

@Injectable()
export class TvDetailRepository extends EntityRepository<TvDetail> {
  constructor(em: EntityManager) {
    super(em, TvDetail);
  }
}
