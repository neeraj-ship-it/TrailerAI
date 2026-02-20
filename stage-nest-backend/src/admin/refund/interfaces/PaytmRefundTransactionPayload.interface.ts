export interface IPaytmRefundTransactionPayload {
  body: {
    mid: string;
    txnType: string;
    orderId: string;
    txnId: string;
    refId: string;
    refundAmount: number;
  };
  head?: { signature: string };
}
