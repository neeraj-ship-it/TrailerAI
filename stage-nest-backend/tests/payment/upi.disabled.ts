import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { VerifyVpaRequestBodyDto } from 'src/payment/dtos/requests/verifyVpa.request.dto';
import { VerifyVPAResponseDTO } from 'src/payment/dtos/responses/verifyVpa.response.dto';
import {
  juspayVerifyVpaInvalidResponseMock,
  juspayVerifyVpaValidResponseMock,
} from 'tests/mocks/juspayMock.response';
import { TestHelperService } from 'tests/testHelper';
jest.mock('axios'); // this is mandatory to mock the axios module

// Module: Upi Integration Tests
describe('MODULE: UPI Tests', () => {
  const verifyUpiApi = '/payments/upi/verify';
  let jwtToken: string;
  beforeAll(async () => {
    // Data is now seeded globally during test setup
    jwtToken = await generateAuthToken();
  });
  beforeEach(() => {
    jest.resetAllMocks(); // reset all mocks before each test
  });

  describe(`POST: ${verifyUpiApi}`, () => {
    it('should return success with VerifyVpaResponse[VALID_RESPONSE]', async () => {
      const upiId = '9644578644@ybl';
      const payload: VerifyVpaRequestBodyDto = {
        upiId,
      };

      await TestHelperService.mockAxiosImplementation(
        APP_CONFIGS.JUSPAY.API_URL + `/v2/upi/verify-vpa`,
        { ...juspayVerifyVpaValidResponseMock, vpa: upiId },
        'post',
      );

      const response = await makeAuthenticatedRequest(jwtToken)
        .post(verifyUpiApi)
        .send(payload);

      // Define expected values
      const expectedData: VerifyVPAResponseDTO = {
        customerName: 'Verified',
        status: 'VALID',
        vpa: upiId,
      };

      // Validate response type and data with expected data
      TestHelperService.validateResponse(response, expectedData, 201);
    });

    it('should return success with VerifyVpaResponse[INVALID_RESPONSE]', async () => {
      const upiId = '0000000000@upi';
      const payload = {
        upiId,
      };
      await TestHelperService.mockAxiosImplementation(
        APP_CONFIGS.JUSPAY.API_URL + `/v2/upi/verify-vpa`,
        { ...juspayVerifyVpaInvalidResponseMock, vpa: upiId },
        'post',
      );
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(verifyUpiApi)
        .set('content-type', 'application/json')
        .send(payload);

      // Define expected values
      const expectedData: VerifyVPAResponseDTO = {
        customerName: 'NA',
        status: 'INVALID',
        vpa: upiId,
      };

      // Validate response type and data with expected data
      TestHelperService.validateResponse(response, expectedData, 201);
    });

    it('should return error with VerifyVpaResponse[INVALID_INPUT]', async () => {
      const upiId = 'test';
      const payload = {
        upiId,
      };
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(verifyUpiApi)
        .send(payload);

      // Validate error response
      TestHelperService.validateErrorResponse(response, 500);
    });
  });
});
