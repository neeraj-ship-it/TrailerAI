export interface SearchForm {
  type: "email" | "phoneNumber";
  value: string;
}
interface RefundStatusHistory {
  refundStatus: string;
  time: Date;
}

export interface RefundSearch {
  _id: string;
  subscriptionId: string;
  vendor: string;
  subscriptionDate: string;
  subscriptionValid: string;
  createdAt: string;
  isRefundable: boolean;
  payingPrice: number;
  refundTransactionId?: string;
  refundAmount?: number;
  refundStatus?: string;
  refundInitiatedByUserName?: string;
  refundStatusHistory?: RefundStatusHistory[];
  refundVendor?: string;
  refundCreatedAt?: Date;
  refundReason?: string;
}

export interface RefundSearchRes {
  transactions: RefundSearch[];
}

export interface InitiateResponse {
  reason: string;
  transactionId: string;
}
