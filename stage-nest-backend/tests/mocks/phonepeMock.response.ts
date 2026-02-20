import { RefundResponse } from '@app/common/utils/phonepe.utils';

export const phonepeRefundValidResponseMock: Omit<
  RefundResponse,
  'error_message' | 'refundStatus'
> = {
  code: 'PAYMENT_SUCCESS',
  data: {
    amount: 100,
    merchantId: '578718928978688',
    payResponseCode: 'SUCCESS',
    providerReferenceId: '1234567890',
    transactionId: 'REFUND_T2409201103477054196096',
  },
  message: 'Refund successful',
  success: true,
};
