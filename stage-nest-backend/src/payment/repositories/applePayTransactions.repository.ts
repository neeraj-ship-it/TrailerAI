import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { ApplePayTransactions } from '../entities/applePayTransactions.entity';

@Injectable()
export class ApplePayTransactionsRepository extends EntityRepository<ApplePayTransactions> {
  constructor(em: EntityManager) {
    super(em, ApplePayTransactions);
  }
  save(data: ApplePayTransactions) {
    return this.em.persistAndFlush(data);
  }
}
