import { userData } from '../seeds/user';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { DeleteActionEnum } from '@app/common/enums/common.enums';

const deleteUserDataApi = '/users/user-data';

describe('MODULE: Delete User Data Tests', () => {
  let jwtToken: string;
  let userId: string;

  beforeAll(async () => {
    // Use seeded user data
    userId = userData[0]._id.toString();
    jwtToken = await generateAuthToken({ userId });
  });

  describe(`DELETE: ${deleteUserDataApi}`, () => {
    it('should successfully delete watchlist data', async () => {
      const payload = {
        actions: [DeleteActionEnum.WATCHLIST],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'User data deleted successfully',
      );
    });

    it('should successfully delete onboarding state', async () => {
      const payload = {
        actions: [DeleteActionEnum.ONBOARDING_STATE],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should successfully delete onboarding preference', async () => {
      const payload = {
        actions: [DeleteActionEnum.ONBOARDING_PREFERENCE],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should successfully delete multiple data types', async () => {
      const payload = {
        actions: [
          DeleteActionEnum.WATCHLIST,
          DeleteActionEnum.ONBOARDING_STATE,
          DeleteActionEnum.ONBOARDING_PREFERENCE,
        ],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'User data deleted successfully',
        success: true,
      });
    });

    it('should return 404 when actions array is empty', async () => {
      const payload = {
        actions: [],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 400 when invalid action is provided', async () => {
      const payload = {
        actions: ['invalidAction'],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should return 400 when actions contain mix of valid and invalid', async () => {
      const payload = {
        actions: [DeleteActionEnum.WATCHLIST, 'invalidAction'],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const payload = {
        actions: [DeleteActionEnum.WATCHLIST],
      };

      const response = await makeAuthenticatedRequest('invalid_token')
        .delete(deleteUserDataApi)
        .set('Authorization', 'Bearer invalid_token')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'INVALID_CREDENTIAL',
        statusCode: 401,
      });
    });

    it('should return 400 when actions field is missing', async () => {
      const payload = {};

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should return 400 when payload is not an object with actions array', async () => {
      const payload = {
        actions: 'not-an-array',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should match snapshot for successful deletion', async () => {
      const payload = {
        actions: [DeleteActionEnum.WATCHLIST],
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .delete(deleteUserDataApi)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload);

      expect(response.body).toMatchSnapshot();
    });
  });
});
