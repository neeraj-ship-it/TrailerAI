import { ErrorCodes } from '@app/error-handler';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from 'tests/utils/makeRequest';

const userSubscriptionApi = '/users/subscription/status';

describe('MODULE: User Subscription Tests', () => {
  describe(`GET: ${userSubscriptionApi}`, () => {
    it('should return users subscription details  with active mandate', async () => {
      const jwtToken: string = await generateAuthToken({ userId: 'user1' });
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userSubscriptionApi}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return users subscription details who is on trial', async () => {
      const jwtToken: string = await generateAuthToken({ userId: 'user2' });
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userSubscriptionApi}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return users subscription details whose mandate is revoked with status not active', async () => {
      const jwtToken: string = await generateAuthToken({ userId: 'user3' });
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userSubscriptionApi}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return no user subscription details found ', async () => {
      const jwtToken: string = await generateAuthToken({ userId: 'user4' });
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${userSubscriptionApi}`,
      );
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: ErrorCodes.SUBSCRIPTION.NOT_FOUND,
      });
    });
  });
});
