import { tags } from 'typia';

import { CurrencyEnum } from '@app/common/enums/app.enum';

export enum SetuEventOperation {
  CREATE = 'create',
  EXECUTE = 'execute',
  NOTIFY = 'notify',
  PAUSE = 'pause',
  REVOKE = 'revoke',
  UNPAUSE = 'unpause',
  UPDATE = 'update',
}

export enum SetuEventStatus {
  FAILED = 'failed',
  INITIATED = 'initiated',
  PENDING = 'pending',
  SUCCESS = 'success',
}

export enum SetuResource {
  MANDATE_OPERATION = 'mandate_operation',
  REFUND = 'refund',
}

export type SetuMandateOperationEventType =
  `${SetuResource.MANDATE_OPERATION}.${SetuEventOperation}.${SetuEventStatus}`;

export type SetuRefundEventType = `${SetuResource.REFUND}.${SetuEventStatus}`;

export interface SetuMandateWebhookCreateOperationDto {
  amount: number;
  amountLimit: number;
  endDate: string;
  eventId: string;

  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string;

  mandateId: string;
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.CREATE;
  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  status: SetuEventStatus;
  txnId: string;
  txnTs: string & tags.Format<'date-time'>;
  umn: string;
}

export interface SetuMandateWebhookExecuteOperationDto {
  amount: number;
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.EXECUTE;

  payment?: {
    rrn: string;
    txnId: string;
    paymentId: string;
    customerVpa: string;
    paymentStatus: string;
  };

  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  seqNum: string;
  status: SetuEventStatus;
  txnId: string;
  // Mandate context
  // "mandateType": "<type>",
  // Mandate reference
  umn: string;
}

export interface SetuRefundWebhookPayloadDto {
  // Refund attributes
  // "refundType": "online", // online | offline
  amount: number;
  crn: string;
  currency: CurrencyEnum;
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuRefundEventType;
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  orgTxnId: string;
  // Payment context
  paymentId: string;
  // Reason
  reason: Record<string, unknown>;
  resource: SetuResource.REFUND;
  rrn: string;
  status: SetuEventStatus;
  txnId: string;
}

export interface SetuMandateWebhookRevokeOperationDto {
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.REVOKE;
  // Reason
  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  status: SetuEventStatus;
  txnId: string;
  // Mandate context
  // "mandateType": "<type>",
  // Mandate reference
  umn: string;
}

export interface SetuMandateWebhookPauseOperationDto {
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.PAUSE;
  // Reason
  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  status: SetuEventStatus;
  txnId: string;
  // Mandate context
  // "mandateType": "<type>",
  // Mandate reference
  umn: string;
}

export interface SetuMandateWebhookUnpauseOperationDto {
  // Event attributes
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.UNPAUSE;
  // Reason
  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  status: SetuEventStatus;
  txnId: string;
  // Mandate context
  // "mandateType": "<type>",
  // Mandate reference
  umn: string;
}

export interface SetuMandateWebhookNotifyOperationDto {
  // Execution attribute
  amount: number;
  // Event attributes
  eventId: string;
  eventTs: string & tags.Format<'date-time'>;
  eventType: SetuMandateOperationEventType;
  id: string; // mandate operation id
  merchantId: string;
  merchantReferenceId: string;
  operation: SetuEventOperation.NOTIFY;
  // Reason
  reason: Record<string, unknown>;
  resource: SetuResource.MANDATE_OPERATION;
  seqNum: string;
  status: SetuEventStatus;
  txnId: string;
  // Mandate context
  // "mandateType": "<type>",
  // Mandate reference
  umn: string;
}

export type SetuWebhookPayloadDto =
  | SetuMandateWebhookCreateOperationDto
  | SetuMandateWebhookRevokeOperationDto
  | SetuMandateWebhookPauseOperationDto
  | SetuMandateWebhookUnpauseOperationDto
  | SetuMandateWebhookNotifyOperationDto
  | SetuMandateWebhookExecuteOperationDto
  | SetuRefundWebhookPayloadDto;
