export interface PaytmDisputeWebhookRequestBodyDto {
  bankReferenceNo: string;
  custId: string;
  disputeAmount: number;
  disputeDueDate: Date;
  disputeId: string;
  disputeStatus: string;
  disputeType: string;
  extSerialNo: string;
  merchantName: string;
  message: string;
  mid: string;
  orderId: string;
  transactionAmount: number;
  transactionDateTime: Date;
  transactionId: string;
}
