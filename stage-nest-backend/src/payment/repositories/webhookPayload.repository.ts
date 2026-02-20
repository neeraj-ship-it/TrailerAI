import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { WebhookPayload } from '@app/payment/entities/webhookPayload.entity';

@Injectable()
export class WebhookPayloadRepository extends EntityRepository<WebhookPayload> {
  constructor(em: EntityManager) {
    super(em, WebhookPayload);
  }
  save(webhookPayload: WebhookPayload) {
    return this.em.persistAndFlush(webhookPayload);
  }
}
