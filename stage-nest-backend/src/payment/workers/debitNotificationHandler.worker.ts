import { OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Logger } from '@nestjs/common';

import { ObjectId, Reference } from '@mikro-orm/mongodb';

import { RECURRING_CONFIG } from '../configs/recurring-flow.config';
import { PaymentGatewayManager } from '../managers/pg.manager';
import { QUEUES } from '@app/common/constants/queues.const';
import { PlanV2 } from '@app/common/entities/planV2.entity';
import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import { PlanV2Repository } from '@app/common/repositories/planV2.repository';
import { Errors } from '@app/error-handler';
import {
  MandateNotification,
  MandateNotificationStatusEnum,
} from '@app/shared/entities/mandateNotification.entity';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import { MandateNotificationRepository } from '@app/shared/repositories/mandateNotification.repository';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';

@Processor(QUEUES.MANDATE_DEBIT_NOTIFICATIONS, {
  concurrency: RECURRING_CONFIG.DEFAULT_BATCH_SIZE,
})
export class HandleDebitNotificationWorker extends WorkerHost {
  private readonly logger = new Logger(HandleDebitNotificationWorker.name);

  constructor(
    private readonly pgManager: PaymentGatewayManager,
    private readonly mandateV2Repository: MandateV2Repository,
    private readonly planV2Repository: PlanV2Repository,
    private readonly mandateNotificationRepository: MandateNotificationRepository,
  ) {
    super();
  }

  @OnQueueEvent('failed')
  onFailed(jobId: string, error: Error) {
    this.logger.error(
      { error },
      `Job ${jobId} failed with error ${error.message}`,
    );
  }

  async process(job: Job<QueuePayload[QUEUES.MANDATE_DEBIT_NOTIFICATIONS]>) {
    this.logger.log(
      `Processing queue:${QUEUES.MANDATE_DEBIT_NOTIFICATIONS} job:${job.id}`,
    );

    const { endAt, mandateId } = job.data;
    const executionDate = endAt instanceof Date ? endAt : new Date(endAt);
    return this.sendPreDebitNotification(executionDate, mandateId);
  }

  async sendPreDebitNotification(executionDate: Date, mandateId: string) {
    const mandate = await this.mandateV2Repository
      .getEntityManager()
      .fork()
      .findOneOrFail(
        MandateV2,
        {
          _id: new ObjectId(mandateId),
          status: MasterMandateStatusEnum.MANDATE_ACTIVE,
        },
        {
          failHandler: () => {
            const msg = `Active mandate not found during pre-debit notification for mandateId:${mandateId}`;
            this.logger.error(msg);
            throw Errors.MANDATE.NOT_FOUND(msg);
          },
          populate: ['plan'],
        },
      );

    const plan = await this.planV2Repository
      .getEntityManager()
      .fork()
      .findOneOrFail(
        PlanV2,
        { _id: new ObjectId(mandate.plan.id) },
        {
          failHandler: () => {
            const msg = `Plan not found during pre-debit notification for planId:${mandate.plan.id}`;
            this.logger.error(msg);
            throw Errors.PLAN.NOT_FOUND(msg);
          },
        },
      );

    const response = await this.pgManager.sendPreDebitNotification(mandate.pg, {
      amount: plan.pricing.netAmount,
      executionDate,
      merchantReferenceId: mandate.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      pgMandateId: mandate.pgMandateId!,
      sequenceNumber: mandate.sequenceNumber,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      umn: mandate.umn!,
    });

    // TODO: check if already exists and handle accordingly
    const forkedMandateNotificationRepo = this.mandateNotificationRepository
      .getEntityManager()
      .fork();

    const mandateNotification = forkedMandateNotificationRepo.create(
      MandateNotification,
      {
        mandate: Reference.create(mandate),
        pgNotificationId: response.notificationId,
        status: MandateNotificationStatusEnum.SENT,
        statusHistory: [
          {
            status: MandateNotificationStatusEnum.SENT,
            txnDate: new Date(),
          },
        ],
        statusUpdatedAt: new Date(),
      },
    );

    return forkedMandateNotificationRepo.persist(mandateNotification).flush();
  }
}
