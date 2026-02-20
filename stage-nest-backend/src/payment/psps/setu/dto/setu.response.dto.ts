export interface SetuCreateMandateResponseDto {
  allowMultipleDebit: boolean;
  amount: number;
  amountRule: string;
  autoExecute: boolean;
  autoPreNotify: boolean;
  blockFunds: boolean;
  createdAt: string;
  creationMode: string;
  currency: string;
  customerRevocable: boolean;
  customerVpa: string;
  endDate: string;
  expireAfter: number;
  firstExecutionAmount: number;
  frequency: string;
  id: string;
  initiationMode: string;
  intentLink: string;
  maxAmountLimit: number;
  merchantId: string;
  merchantVpa: string;
  purpose: string;
  qrCode: string;
  recurrenceRule: string;
  recurrenceValue: number;
  referenceId: string;
  shareToPayee: boolean;
  startDate: string;
  status: string;
  transactionNote: string;
  txnId: string;
}

export interface SetuSendPreDebitNotificationResponseDto {
  amount: number;
  createdAt: string;
  executionDate: string;
  id: string;
  mandateId: string;
  merchantId: string;
  merchantReferenceId: string;
  sequenceNumber: number;
  status: string;
  txnId: string;
  umn: string;
}

export interface SetuExecuteMandateResponseDto {
  amount: number;
  createdAt: string;
  id: string; // id is a unique ID that is associated with this mandate execution and can be used to track it later.
  mandateId: string;
  merchantId: string;
  referenceId: string;
  remark: string;
  sequenceNumber: number;
  status: 'pending' | 'initiated' | 'success' | 'failed';
  txnId: string; // Npci txn id
  umn: string;
}

export interface SetuMandateNotificationStatusResponseDto {
  amount: number;
  createdAt: string;
  executionDate: string;
  id: string;
  mandateId: string;
  merchantId: string;
  reason?: {
    code: string;
    desc: string;
    npciErrCategory: string;
    npciErrCode: string;
    npciErrDesc: string;
    npciRespCode: string;
    npciRespDesc: string;
    setuDescription: string;
    suggestedAction: string;
  };
  referenceId: string;
  sequenceNumber: number;
  status: 'pending' | 'initiated' | 'success' | 'failed';
  txnId: string;
  umn: string;
}
