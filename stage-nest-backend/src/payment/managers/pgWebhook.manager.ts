import { Injectable } from '@nestjs/common';

import { MandateTransactionStatus } from '../entities/mandateTransactions.entity';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import {
  WebhookOperation,
  WebhookResource,
  WebhookStatus,
} from '../interfaces/parseWebhook.interface';
import {
  SetuEventOperation,
  SetuEventStatus,
  SetuMandateWebhookCreateOperationDto,
  SetuMandateWebhookExecuteOperationDto,
  SetuMandateWebhookPauseOperationDto,
  SetuResource,
  SetuWebhookPayloadDto,
} from '../psps/setu/dto/setu.webhook.dto';
import { MandateService } from '../services/mandate.service';
import { PaymentGatewayManager } from './pg.manager';
import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { toRupee } from '@app/common/utils/helpers';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';
import { MandateNotificationStatusEnum } from '@app/shared/entities/mandateNotification.entity';

@Injectable()
export class PGWebhookManager {
  constructor(
    private readonly pgManager: PaymentGatewayManager,
    private readonly mandateService: MandateService,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  private isMandateCreateWebhook(
    payload: SetuWebhookPayloadDto,
  ): payload is SetuMandateWebhookCreateOperationDto {
    return (
      payload.resource === SetuResource.MANDATE_OPERATION &&
      payload.operation === SetuEventOperation.CREATE
    );
  }

  private isMandateExecuteOperationWebhook(
    payload: SetuWebhookPayloadDto,
  ): payload is SetuMandateWebhookExecuteOperationDto {
    return (
      payload.resource === SetuResource.MANDATE_OPERATION &&
      payload.operation === SetuEventOperation.EXECUTE
    );
  }

  private isMandatePauseOperationWebhook(
    payload: SetuWebhookPayloadDto,
  ): payload is SetuMandateWebhookPauseOperationDto {
    return (
      payload.resource === SetuResource.MANDATE_OPERATION &&
      (payload.operation === SetuEventOperation.PAUSE ||
        payload.operation === SetuEventOperation.UNPAUSE)
    );
  }

  handleSetuWebhook(webhookPayload: SetuWebhookPayloadDto) {
    const { operation, resource, status } = this.pgManager.handleWebhook(
      PaymentGatewayEnum.SETU,
      webhookPayload,
    );
    if (this.isMandateCreateWebhook(webhookPayload)) {
      if (
        operation === WebhookOperation.CREATE &&
        resource === WebhookResource.MANDATE_OPERATION &&
        [SetuEventStatus.FAILED, SetuEventStatus.SUCCESS].includes(
          webhookPayload.status,
        )
      ) {
        return this.mandateService.handleMandateActivation({
          amount: toRupee(webhookPayload.amount), // converting paisa to rupee
          mandateId: webhookPayload.merchantReferenceId,
          pg: PaymentGatewayEnum.SETU,
          pgMandateId: webhookPayload.mandateId,
          pgResponse: webhookPayload,
          status:
            webhookPayload.status === SetuEventStatus.SUCCESS
              ? MasterMandateStatusEnum.MANDATE_ACTIVE
              : MasterMandateStatusEnum.MANDATE_FAILED,
          umn: webhookPayload.umn,
          vendor: PaymentGatewayEnum.SETU,
        });
      }
    }

    if (this.isMandatePauseOperationWebhook(webhookPayload)) {
      if (
        operation === WebhookOperation.PAUSE &&
        resource === WebhookResource.MANDATE_OPERATION &&
        status === WebhookStatus.SUCCESS
      ) {
        return this.mandateService.handleMandatePause({
          mandateId: webhookPayload.merchantReferenceId,
          pgMandateId: webhookPayload.umn,
        });
      }
    }

    // mandate.unpause.success
    if (
      operation === WebhookOperation.UNPAUSE &&
      resource === WebhookResource.MANDATE_OPERATION &&
      status === WebhookStatus.SUCCESS
    ) {
      return this.mandateService.handleMandateResume({
        mandateId: webhookPayload.merchantReferenceId,
      });
    }

    // mandate.revoke.success
    if (
      operation === WebhookOperation.REVOKE &&
      resource === WebhookResource.MANDATE_OPERATION &&
      status === WebhookStatus.SUCCESS
    ) {
      return this.mandateService.handleMandateRevoke({
        mandateId: webhookPayload.merchantReferenceId,
      });
    }
    if (
      operation === WebhookOperation.NOTIFY &&
      resource === WebhookResource.MANDATE_OPERATION &&
      [WebhookStatus.FAILED, WebhookStatus.SUCCESS].includes(status)
    ) {
      return this.mandateService.updateMandateNotificationStatus({
        mandateId: webhookPayload.merchantReferenceId,
        payload: webhookPayload,
        pgNotificationId: webhookPayload.id,
        status:
          webhookPayload.status === SetuEventStatus.SUCCESS
            ? MandateNotificationStatusEnum.SUCCESS
            : MandateNotificationStatusEnum.FAILED,
      });
    }

    if (this.isMandateExecuteOperationWebhook(webhookPayload)) {
      if (
        operation === WebhookOperation.EXECUTE &&
        resource === WebhookResource.MANDATE_OPERATION &&
        [WebhookStatus.FAILED, WebhookStatus.SUCCESS].includes(status)
      ) {
        return this.mandateService.handleMandateDebit({
          amount: toRupee(webhookPayload.amount),
          mandateId: webhookPayload.merchantReferenceId,
          pgResponse: webhookPayload,
          status:
            webhookPayload.status === SetuEventStatus.SUCCESS
              ? MandateTransactionStatus.SUCCESS
              : MandateTransactionStatus.FAILED,
        });
      }
    }
  }
}
