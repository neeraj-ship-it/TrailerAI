import {
  SetuWebhookPayloadDto,
  SetuEventOperation,
  SetuEventStatus,
  SetuResource,
} from './dto/setu.webhook.dto';
import {
  ParsedWebhook,
  WebhookOperation,
  WebhookResource,
  WebhookStatus,
} from 'src/payment/interfaces/parseWebhook.interface';

export class SetuWebhookParser {
  private handleExecute(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.EXECUTE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.EXECUTE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.EXECUTE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }
  private handleMandateCreate(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.CREATE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.CREATE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.CREATE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }
  private handleMandateOperation(
    payload: SetuWebhookPayloadDto,
  ): ParsedWebhook {
    switch (payload.resource) {
      case SetuResource.MANDATE_OPERATION:
        switch (payload.operation) {
          case SetuEventOperation.CREATE:
            return this.handleMandateCreate(payload);
          case SetuEventOperation.NOTIFY:
            return this.handleNotify(payload);
          case SetuEventOperation.EXECUTE:
            return this.handleExecute(payload);
          case SetuEventOperation.PAUSE:
            return this.handleMandatePause(payload);
          case SetuEventOperation.UNPAUSE:
            return this.handleMandateResume(payload);
          case SetuEventOperation.REVOKE:
            return this.handleMandateRevoke(payload);
          default:
            throw new Error(`Unsupported operation`);
        }
      case SetuResource.REFUND:
        return this.handleRefund(payload);
      default:
        throw new Error('Invalid resource');
    }
  }

  private handleMandatePause(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.PAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.PAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.PAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }

  private handleMandateResume(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.UNPAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.UNPAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.UNPAUSE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }

  private handleMandateRevoke(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.REVOKE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.REVOKE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.REVOKE,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }
  private handleNotify(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.NOTIFY,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.NOTIFY,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.FAILED,
      };
    }
    if (payload.status === SetuEventStatus.INITIATED) {
      return {
        operation: WebhookOperation.NOTIFY,
        resource: WebhookResource.MANDATE_OPERATION,
        status: WebhookStatus.INITIATED,
      };
    }
    throw new Error('Invalid status');
  }
  private handleRefund(payload: SetuWebhookPayloadDto): ParsedWebhook {
    if (payload.status === SetuEventStatus.SUCCESS) {
      return {
        operation: WebhookOperation.CREATE,
        resource: WebhookResource.REFUND,
        status: WebhookStatus.SUCCESS,
      };
    }
    if (payload.status === SetuEventStatus.FAILED) {
      return {
        operation: WebhookOperation.CREATE,
        resource: WebhookResource.REFUND,
        status: WebhookStatus.FAILED,
      };
    }
    throw new Error('Invalid status');
  }

  handle(payload: SetuWebhookPayloadDto): ParsedWebhook {
    const supportedResources = [SetuResource.MANDATE_OPERATION];

    if (!supportedResources.includes(payload.resource)) {
      throw new Error('Invalid resource');
    }

    return this.handleMandateOperation(payload);
  }
}
