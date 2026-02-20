import { Processor, WorkerHost } from '@nestjs/bullmq';

import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';

import { Logger } from '@nestjs/common';

import { Job, UnrecoverableError } from 'bullmq';

import { ObjectId, QueryOrder } from '@mikro-orm/mongodb';

import { RECURRING_CONFIG } from '../configs/recurring-flow.config';
import { PaymentGatewayManager } from '../managers/pg.manager';
import { QUEUES } from '@app/common/constants/queues.const';
import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { ErrorHandlerService } from '@app/error-handler';
import {
  MandateNotification,
  MandateNotificationStatusEnum,
} from '@app/shared/entities/mandateNotification.entity';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import { MandateNotificationRepository } from '@app/shared/repositories/mandateNotification.repository';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';

@Processor(QUEUES.MANDATE_DEBIT_EXECUTION, {
  concurrency: RECURRING_CONFIG.DEFAULT_BATCH_SIZE,
})
export class HandleMandateDebitWorker extends WorkerHost {
  private readonly logger = new Logger(HandleMandateDebitWorker.name);
  constructor(
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly mandateV2Repository: MandateV2Repository,
    private readonly mandateNotificationRepository: MandateNotificationRepository,
    private readonly pgManager: PaymentGatewayManager,
  ) {
    super();
  }

  private async handleMandateDebitExecution(
    data: QueuePayload[QUEUES.MANDATE_DEBIT_EXECUTION],
  ) {
    const { amount, mandateId, pgMandateId, userSubscriptionId } = data;
    const mandate = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.mandateV2Repository
        .getEntityManager()
        .fork()
        .findOne(MandateV2, {
          _id: new ObjectId(mandateId),
        }),
      new UnrecoverableError(
        `The mandate with id: ${mandateId} for userSubscriptionId: ${userSubscriptionId} does not exist`,
      ),
    );
    if (mandate.status !== MasterMandateStatusEnum.MANDATE_ACTIVE) {
      throw new UnrecoverableError(
        `The mandate with id: ${mandateId} is not active. Mandate status: ${mandate.status}`,
      );
    }

    const response = await this.pgManager.executeMandate(mandate.pg, {
      amount: amount,
      merchantReferenceId: mandateId,
      pgMandateId,
      remark: 'Stage ott subscription',
      sequenceNumber: mandate.sequenceNumber,
      umn: mandate.umn ?? '', // will always be there in setu
    });

    // Mark latest pre-debit notification as executed
    const mandateNotification =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.mandateNotificationRepository
          .getEntityManager()
          .fork()
          .findOne(
            MandateNotification,
            {
              mandate: new ObjectId(mandateId),
              status: MandateNotificationStatusEnum.SUCCESS,
            },
            {
              orderBy: { createdAt: QueryOrder.DESC },
            },
          ),
        new UnrecoverableError(
          `The pre-debit notification with mandateId:${mandateId} for userSubscriptionId:${userSubscriptionId} does not exist`,
        ),
      );

    if (response.status === 'failed') {
      this.logger.error(
        { response },
        `Mandate execution failed for mandateId:${mandateId}`,
      );
    }

    mandateNotification.status = MandateNotificationStatusEnum.EXECUTED;
    mandateNotification.pgExecutionId = response.id;
    mandate.sequenceNumber = mandate.sequenceNumber + 1; // increment sequence number as this execution cycle is complete

    return Promise.all([
      this.mandateV2Repository
        .getEntityManager()
        .fork()
        .persistAndFlush(mandate),
      this.mandateNotificationRepository
        .getEntityManager()
        .fork()
        .persistAndFlush(mandateNotification),
    ]);
  }

  async process(job: Job<QueuePayload[QUEUES.MANDATE_DEBIT_EXECUTION]>) {
    this.logger.log(
      `Processing queue:${QUEUES.MANDATE_DEBIT_EXECUTION} job:${job.id}`,
    );
    return this.handleMandateDebitExecution(job.data);
  }
}
