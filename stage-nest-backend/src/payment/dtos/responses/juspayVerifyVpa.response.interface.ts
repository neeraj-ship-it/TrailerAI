export interface IJuspayVerifyVpaResponse {
  customer_name: string;
  mandate_details: { customer_name: string };
  status: string;
  vpa: string;
}

export interface IJuspayRefundResponse {
  amount: number;
  amount_refunded: number;
  auth_type: string;
  bank_error_code: string;
  bank_error_message: string;
  bank_pg: null;
  card: {
    using_token: boolean;
    using_saved_card: boolean;
    saved_to_locker: boolean;
    name_on_card: string;
    last_four_digits: string;
    expiry_year: string;
    expiry_month: string;
    card_type: string;
    card_reference: string;
    card_issuer: string;
    card_isin: string;
    card_fingerprint: string;
    card_brand: string;
  };
  currency: string;
  customer_email: string;
  customer_id: string;
  customer_phone: string;
  date_created: string;
  effective_amount: number;
  gateway_id: number;
  gateway_reference_id: string;
  id: string;
  merchant_id: string;
  metadata: object;
  offers: [];
  order_id: string;
  payment_gateway_response: {
    txn_id: string;
    rrn: string;
    resp_message: string;
    resp_code: string;
    epg_txn_id: string;
    created: string;
    auth_id_code: string;
  };
  payment_links: {
    web: string;
    mobile: string;
    iframe: string;
  };
  payment_method: string;
  payment_method_type: string;
  product_id: string;
  refunded: boolean;
  refunds: {
    unique_request_id: string;
    status: string;
    sent_to_gateway: boolean;
    refund_type: string;
    refund_source: string;
    ref: null;
    initiated_by: string;
    id: null;
    error_message: string;
    error_code: null;
    created: string;
    amount: number;
  }[];
  return_url: string;
  rewards_breakup: null;
  status: string;
  status_id: number;
  txn_detail: {
    txn_uuid: string;
    txn_id: string;
    txn_amount: number;
    tax_amount: number | null;
    surcharge_amount: number | null;
    status: string;
    redirect: boolean;
    order_id: string;
    net_amount: number;
    gateway_id: number;
    gateway: string;
    express_checkout: boolean;
    error_message: string;
    error_code: string;
    currency: string;
    created: string;
  };
  txn_id: string;
  txn_uuid: string;
  udf1: string;
  udf10: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  udf6: string;
  udf7: string;
  udf8: string;
  udf9: string;
}
