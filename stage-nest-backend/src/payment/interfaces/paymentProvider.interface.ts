import { CreatedMandate, CreateMandate } from './createMandate.interface';
import { ParsedWebhook } from './parseWebhook.interface';

export interface SendPreDebitNotification {
  amount: number;
  executionDate: Date;
  merchantReferenceId: string;
  pgMandateId: string;
  sequenceNumber: number;
  umn: string;
}

export interface ExecuteMandate {
  amount: number;
  merchantReferenceId: string;
  pgMandateId: string;
  remark: string;
  sequenceNumber: number;
  umn: string;
}

export interface MandateNotificationStatus {
  mandateId: string;
  notificationId: string;
  status: 'pending' | 'initiated' | 'success' | 'failed';
}

export interface VerifyPayload {
  signature: string;
  verificationPayload: unknown;
}

export interface PaymentProviderAdapter {
  checkMandateNotificationStatus: ({
    mandateId,
    notificationId,
  }: {
    notificationId: string;
    mandateId: string;
  }) => Promise<MandateNotificationStatus>;
  checkMandateStatus: () => void;
  createMandate: (createMandate: CreateMandate) => Promise<CreatedMandate>;
  deductPayment: () => void;
  executeMandate: (executeMandate: ExecuteMandate) => Promise<{
    id: string;
    status: 'pending' | 'initiated' | 'success' | 'failed';
  }>;
  initiateRefund: () => void;
  parseWebhook: (webhookPayload: unknown) => ParsedWebhook;
  sendPreDebitNotification: (
    sendPreDebitNotification: SendPreDebitNotification,
  ) => Promise<{ notificationId: string }>;
  verifySignature: (payload: VerifyPayload) => boolean;
}
