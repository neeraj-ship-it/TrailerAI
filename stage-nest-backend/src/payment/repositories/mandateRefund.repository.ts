import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { MandateRefund } from '../entities/mandateRefund.entity';

export class MandateRefundRepository extends EntityRepository<MandateRefund> {
  constructor(em: EntityManager) {
    super(em, MandateRefund);
  }
  save(txnRefund: MandateRefund) {
    return this.em.persistAndFlush(txnRefund);
  }
}
