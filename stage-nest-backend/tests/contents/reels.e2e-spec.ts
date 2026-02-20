import {
  generateAuthToken,
  makeAuthenticatedRequest,
  makePlatformPublicRequest,
} from '../utils/makeRequest';
import { ErrorCodes } from '@app/error-handler';

const getReelByIdApi = '/contents/reels/id';

describe('MODULE: Reels Tests', () => {
  let jwtToken: string;
  beforeAll(async () => {
    // Data is now seeded globally during test setup
    jwtToken = await generateAuthToken();
  });

  describe(`GET: ${getReelByIdApi}`, () => {
    it('should return reel details when valid reelId is provided and user is authenticated', async () => {
      const reelId = '507f1f77bcf86cd799439011';
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${getReelByIdApi}?reelId=${reelId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return error when valid reelId is provided and user is not authenticated', async () => {
      const reelId = '507f1f77bcf86cd799439012';
      const response = await makePlatformPublicRequest().get(
        `${getReelByIdApi}?reelId=${reelId}`,
      );

      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });

    it('should return error when reel is not found', async () => {
      const nonExistentReelId = '507f1f77bcf86cd799439999';
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${getReelByIdApi}?reelId=${nonExistentReelId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: ErrorCodes.REEL.REEL_NOT_FOUND,
        statusCode: 404,
      });
    });

    it('should return error when reelId is missing from query parameters', async () => {
      const response =
        await makeAuthenticatedRequest(jwtToken).get(getReelByIdApi);

      expect(response.status).toBe(400);
    });

    it('should return movie reel details when valid movie reelId is provided', async () => {
      const reelId = '507f1f77bcf86cd799439013';
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${getReelByIdApi}?reelId=${reelId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });
});
