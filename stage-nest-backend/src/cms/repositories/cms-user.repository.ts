import { EntityManager, MongoEntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { CMSUser } from '../entities/cms-user.entity';

@Injectable()
export class CMSUserRepository extends MongoEntityRepository<CMSUser> {
  constructor(readonly em: EntityManager) {
    super(em, CMSUser);
  }
  async save(user: CMSUser) {
    return this.em.persistAndFlush(user);
  }
}
