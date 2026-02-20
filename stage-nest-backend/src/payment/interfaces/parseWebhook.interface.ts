export enum WebhookResource {
  MANDATE = 'mandate',
  MANDATE_OPERATION = 'mandate_operation',
  REFUND = 'refund',
}

export enum WebhookOperation {
  CREATE = 'create',
  EXECUTE = 'execute',
  NOTIFY = 'notify',
  PAUSE = 'pause',
  REVOKE = 'revoke',
  UNPAUSE = 'unpause',
  UPDATE = 'update',
}

export enum WebhookStatus {
  FAILED = 'failed',
  INITIATED = 'initiated',
  SUCCESS = 'success',
}

export interface ParsedWebhook {
  operation: WebhookOperation;
  resource: WebhookResource;
  status: WebhookStatus;
}
