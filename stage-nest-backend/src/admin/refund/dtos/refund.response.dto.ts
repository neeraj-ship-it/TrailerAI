interface RefundStatusHistoryDto {
  refundStatus: string;
  time: Date;
}

export interface RefundResponseDto {
  reason: string;
  refundAmount: number;
  refundInitiatedByUserName: string;
  refundStatus: string;
  refundStatusHistory: RefundStatusHistoryDto[];
  refundTransactionId: string;
  vendor: string;
}
