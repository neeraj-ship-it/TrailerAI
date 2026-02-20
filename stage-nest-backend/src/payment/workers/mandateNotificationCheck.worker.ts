import { WorkerHost } from '@nestjs/bullmq';

import { Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Logger } from '@nestjs/common';

import { PaymentGatewayManager } from '../managers/pg.manager';
import { QUEUES } from '@app/common/constants/queues.const';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import {
  MandateNotification,
  MandateNotificationStatusEnum,
} from '@app/shared/entities/mandateNotification.entity';
import { MandateNotificationRepository } from '@app/shared/repositories/mandateNotification.repository';

@Processor(QUEUES.MANDATE_NOTIFICATION_CHECK, {
  concurrency: 100,
})
export class MandateNotificationCheckWorker extends WorkerHost {
  private logger = new Logger(MandateNotificationCheckWorker.name);

  constructor(
    private readonly pgManager: PaymentGatewayManager,
    private readonly mandateNotificationRepository: MandateNotificationRepository,
  ) {
    super();
  }

  private async handleMandateNotificationCheck(
    data: QueuePayload[QUEUES.MANDATE_NOTIFICATION_CHECK],
  ) {
    const { pg, pgMandateId, pgNotificationId } = data;
    const response = await this.pgManager.checkMandateNotificationStatus(pg, {
      pgMandateId,
      pgNotificationId,
    });

    const mandateNotification = await this.mandateNotificationRepository
      .getEntityManager()
      .fork()
      .findOneOrFail(MandateNotification, {
        pgNotificationId,
      });
    mandateNotification.status =
      response.status === 'success'
        ? MandateNotificationStatusEnum.SUCCESS
        : response.status === 'failed'
          ? MandateNotificationStatusEnum.FAILED
          : mandateNotification.status;

    return this.mandateNotificationRepository
      .getEntityManager()
      .fork()
      .upsert(mandateNotification);
  }

  async process(job: Job<QueuePayload[QUEUES.MANDATE_NOTIFICATION_CHECK]>) {
    this.logger.log(
      `Processing queue:${QUEUES.MANDATE_NOTIFICATION_CHECK} job:${job.id}`,
    );
    return this.handleMandateNotificationCheck(job.data);
  }
}
