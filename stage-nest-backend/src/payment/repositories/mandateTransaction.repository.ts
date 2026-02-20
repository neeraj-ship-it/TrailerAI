import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { MandateTransactions } from '../entities/mandateTransactions.entity';

@Injectable()
export class MandateTransactionRepository extends EntityRepository<MandateTransactions> {
  constructor(em: EntityManager) {
    super(em, MandateTransactions);
  }
  save(mandateTransaction: MandateTransactions) {
    return this.em.persistAndFlush(mandateTransaction);
  }
}
