import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { ThumbnailCtr } from '../entities/thumbnail-ctr.entity';

@Injectable()
export class ThumbnailCtrRepository extends EntityRepository<ThumbnailCtr> {
  constructor(readonly em: EntityManager) {
    super(em, ThumbnailCtr);
  }
}
