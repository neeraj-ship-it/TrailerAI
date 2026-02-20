/* eslint-disable */

export interface RazorpayDisputeWebhookRequestBodyDto {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: RazorpayPayload;
  created_at: number;
}

interface RazorpayPayload {
  payment: { entity: RazorpayPaymentEntity };
  dispute: { entity: RazorpayDisputeEntity };
}

interface RazorpayPaymentEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  base_amount: number;
  status: string;
  order_id: string;
  invoice_id: any;
  international: boolean;
  method: string;
  amount_refunded: number;
  amount_transferred: number;
  refund_status: any;
  captured: boolean;
  description: any;
  card_id: any;
  bank: any;
  wallet: any;
  vpa: string;
  email: string;
  contact: string;
  customer_id: string;
  token_id: string;
  notes: {
    orderId: string;
    subscriptionType: string;
    userId: string;
    transactionType: string;
  };
  fee: number;
  tax: number;
  error_code: any;
  error_description: any;
  error_source: any;
  error_step: any;
  error_reason: any;
  acquirer_data: {
    rrn: string;
  };
  created_at: number;
  upi: {
    vpa: string;
  };
}

interface RazorpayDisputeEntity {
  id: string;
  entity: string;
  payment_id: string; // unique identifier to map back to user's payment
  amount: number;
  currency: string;
  amount_deducted: number;
  gateway_dispute_id: string;
  reason_code: string;
  respond_by: number;
  status: string;
  phase: string;
  comments: any;
  evidence: string;
  created_at: number;
}
