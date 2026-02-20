import { EntityRepository } from '@mikro-orm/mongodb';
import { EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { Theme } from '../entities/themes.entity';

@Injectable()
export class ThemeRepository extends EntityRepository<Theme> {
  constructor(readonly em: EntityManager) {
    super(em, Theme);
  }
}
