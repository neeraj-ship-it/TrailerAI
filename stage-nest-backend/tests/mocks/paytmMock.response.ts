import { IPaytmRefundResponse } from 'common/utils/paytm.utils';

export const paytmRefundResponseExample: Omit<
  IPaytmRefundResponse,
  'refunded'
> = {
  body: {
    acceptRefundStatus: 'ACCEPTED',
    acceptRefundTimestamp: '2023-05-15T10:28:45+05:30',
    merchantRefundRequestTimestamp: '2023-05-15T10:25:30+05:30',
    mid: 'MERCHANT123456789',
    orderId: 'ORDER123456789',
    refId: 'REF123456789',
    refundAmount: '1000.00',
    refundDetailInfoList: [
      {
        payMethod: 'UPI',
        refundAmount: '1000.00',
        refundType: 'FULL',
        userMobileNo: '9876543210',
      },
    ],
    refundId: 'REFUND123456789',
    refundReason: 'Customer request',
    resultInfo: {
      resultCode: '200',
      resultMsg: 'Refund initiated successfully',
      resultStatus: 'TXN_SUCCESS',
    },
    source: 'API',
    totalRefundAmount: '1000.00',
    txnAmount: '1000.00',
    txnId: 'TXN123456789',
    txnTimestamp: '2023-05-15T09:30:00+05:30',
    userCreditInitiateStatus: 'SUCCESS',
  },
  head: {
    responseTimestamp: '2023-05-15T10:30:45+05:30',
    signature: 'abcdef1234567890',
    version: 'v1',
  },
};
