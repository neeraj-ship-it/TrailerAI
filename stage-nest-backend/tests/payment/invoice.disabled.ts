import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { generateInvoiceResponse } from './data/invoice.response';
import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { InvoiceResponse } from '@app/payment/dtos/invoice.request.dto';
import { generateUserSubscriptionHistory } from 'tests/seeds/userSubscriptionHistory';
import { TestHelperService } from 'tests/testHelper';
import { getTestEntity } from 'tests/testSetup';

// Module: Invoice Integration Tests
describe('MODULE: Invoice Tests', () => {
  let jwtToken: string;
  let userSubscriptionHistory: Omit<UserSubscriptionHistory, keyof Document>[] =
    [];

  beforeAll(async () => {
    const userSubscriptionHistoryEntity =
      getTestEntity<UserSubscriptionHistory>(UserSubscriptionHistory.name);
    if (!userSubscriptionHistoryEntity) {
      console.log('Failed to get test entity for user subscription history');
      return;
    }
    userSubscriptionHistory = generateUserSubscriptionHistory(10) as Omit<
      UserSubscriptionHistory,
      keyof Document
    >[];

    // seeding user subscription history data
    await userSubscriptionHistoryEntity.insertMany(userSubscriptionHistory);
    jwtToken = await generateAuthToken();
  });
  const fetchAllInvoiceApi = '/payments/invoices/allDetails';

  describe(`GET: ${fetchAllInvoiceApi}`, () => {
    it('should return success with AllInvoiceResponseDTO[VALID_RESPONSE]', async () => {
      // request formation
      const page = 1;
      const perPage = 10;
      const uri = fetchAllInvoiceApi + `?page=${page}&perPage=${perPage}`;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(uri)
        .set('content-type', 'application/json');

      // Define expected values
      const expectedData: PaginatedResponseDTO<InvoiceResponse> =
        generateInvoiceResponse(page, perPage, false, userSubscriptionHistory);

      expect(response.body.data.length).toEqual(10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.body.data.map((invoice: any) => {
        invoice.subscriptionDate = new Date(invoice.subscriptionDate);
        invoice.subscriptionValid = new Date(invoice.subscriptionValid);
      });

      // Validate response type and data with expected data
      TestHelperService.validateResponse(response, expectedData, 200);
    });
  });
});
