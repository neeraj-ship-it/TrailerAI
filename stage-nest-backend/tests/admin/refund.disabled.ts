import { TestBed } from '@automock/jest';

import { APP_CONFIGS } from '@app/common/configs/app.config';

import { RecurringRefundStatus } from '@app/common/enums/common.enums';

import { privilegesEnum } from 'src/admin/adminUser/enums/privileges.enum';
import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';
import { RefundRequestDto } from 'src/admin/refund/dtos/refund.request.dto';
import { juspayRefundValidResponseMock } from 'tests/mocks/juspayMock.response';
import { paytmRefundResponseExample } from 'tests/mocks/paytmMock.response';
import { phonepeRefundValidResponseMock } from 'tests/mocks/phonepeMock.response';

import { TestHelperService } from 'tests/testHelper';
import { makeAuthenticatedAdminRequest } from 'tests/utils/makeRequest';

jest.mock('axios');

const getTransactions = '/admin/refund/transactions';
const initiateRefund = '/admin/refund/initiate';

describe('Admin Refund Service Tests', () => {
  const { unit: adminAuthService } = TestBed.create(AdminAuthService).compile();
  let superAdminToken: string;
  beforeAll(async () => {
    superAdminToken = await adminAuthService.generateJwtToken({
      privileges: [privilegesEnum.FULL_ACCESS],
      role: 'Super Admin',
      userId: '66e01242450ec6af8f4cbc0c',
    });
  });

  it('Services should be defined', () => {
    expect(adminAuthService).toBeDefined();
  });
  describe('Refund Controller', () => {
    it('should get the transactions if the user has admin access', async () => {
      const queryParam = {
        mobileNumber: '1234567890',
      };
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .get(getTransactions)
        .query(queryParam);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        transactions: [
          {
            createdAt: '2024-09-20T05:33:49.233Z',
            isRefundable: true,
            payingPrice: 199,
            subscriptionDate: '2024-09-20T05:33:49.232Z',
            subscriptionId: 'JUSPAY_T2409201103477054196093',
            subscriptionValid: expect.any(String),
            vendor: 'JUSPAY',
          },
        ],
      });
      expect(response.body).toMatchSnapshot();
    });
    it('Initiate refund for Juspay', async () => {
      const refundPayload: RefundRequestDto = {
        reason: 'test',
        transactionId: 'JUSPAY_T2409201103477054196093',
      };
      await TestHelperService.mockAxiosImplementation(
        APP_CONFIGS.JUSPAY.API_URL +
          `/orders/66ed092ad41927343eb97667--1/refunds`,
        juspayRefundValidResponseMock,
        'post',
      );
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .post(initiateRefund)
        .set('content-type', 'application/json')
        .send(refundPayload);
      expect(response.body).toMatchObject({
        reason: 'test',
        refundAmount: 199,
        refundInitiatedByUserName: 'Sumit Chauhan',
        refundStatus: RecurringRefundStatus.REFUND_PENDING,
        refundStatusHistory: [
          {
            refundStatus: RecurringRefundStatus.REFUND_PENDING,
            time: expect.any(String),
          },
          {
            refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
            time: expect.any(String),
          },
        ],
        refundTransactionId: 'TEST1637681731',
        vendor: 'JUSPAY',
      });
    });
    it('Initiate refund for Phonepe', async () => {
      const refundPayload: RefundRequestDto = {
        reason: 'test',
        transactionId: 'PHONEPE_T2409201103477054196096',
      };
      await TestHelperService.mockAxiosImplementation(
        APP_CONFIGS.PHONEPE.API_URL + APP_CONFIGS.PHONEPE.REFUND_URL_PATH,
        phonepeRefundValidResponseMock,
        'post',
      );
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .post(initiateRefund)
        .set('content-type', 'application/json')
        .send(refundPayload);
      expect(response.body).toMatchObject({
        reason: 'test',
        refundAmount: 199,
        refundInitiatedByUserName: 'Sumit Chauhan',
        refundStatus: RecurringRefundStatus.REFUND_SUCCESSFUL,
        refundStatusHistory: [
          {
            refundStatus: RecurringRefundStatus.REFUND_SUCCESSFUL,
            time: expect.any(String),
          },
          {
            refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
            time: expect.any(String),
          },
        ],
        refundTransactionId: 'REFUND_T2409201103477054196096',
        vendor: 'PHONEPE',
      });
    });
    it('Initiate refund for Paytm', async () => {
      const refundPayload: RefundRequestDto = {
        reason: 'test',
        transactionId: 'PAYTM_T2409201103477054196099',
      };
      await TestHelperService.mockAxiosImplementation(
        APP_CONFIGS.PAYTM.API_URL + APP_CONFIGS.PAYTM.REFUND_URL_PATH,
        paytmRefundResponseExample,
        'post',
      );
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .post(initiateRefund)
        .set('content-type', 'application/json')
        .send(refundPayload);

      expect(response.body).toMatchObject({
        reason: 'test',
        refundAmount: 199,
        refundInitiatedByUserName: 'Sumit Chauhan',
        refundStatus: RecurringRefundStatus.REFUND_SUCCESSFUL,
        refundStatusHistory: [
          {
            refundStatus: RecurringRefundStatus.REFUND_SUCCESSFUL,
            time: expect.any(String),
          },
          {
            refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
            time: expect.any(String),
          },
        ],
        refundTransactionId: 'REFUND_REFID1234567890',
        vendor: 'PAYTM',
      });
    });
  });
});
