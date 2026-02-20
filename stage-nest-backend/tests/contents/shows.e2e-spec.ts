import { showData } from '../seeds/shows';
import {
  generateAuthToken,
  makeAuthenticatedRequest,
  makePlatformPublicRequest,
  makePlatformPublicRequestWithAuth,
} from '../utils/makeRequest';
import { Platform } from '@app/common/enums/app.enum';
import { ErrorCodes } from '@app/error-handler';
import { MicroDramaAction } from 'src/content/dto/microDrama.dto';

const showDetailsApi = '/contents/shows/details';
const microDramaInteractionApi = '/contents/shows/micro-drama-interaction';

describe('MODULE: Shows Tests', () => {
  let jwtToken: string;
  beforeAll(async () => {
    // Data is now seeded globally during test setup
    jwtToken = await generateAuthToken();
  });

  describe(`GET: ${showDetailsApi}`, () => {
    it('should return show details when valid showId is provided', async () => {
      const showId = 7;
      const response = await makePlatformPublicRequest().get(
        `${showDetailsApi}?showId=${showId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return error when show is not found', async () => {
      const nonExistentShowId = 9999;
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${showDetailsApi}?showId=${nonExistentShowId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: ErrorCodes.SHOW.NOT_FOUND,
        statusCode: 404,
      });
    });
  });

  describe(`GET: ${showDetailsApi} v2`, () => {
    it('should return show details when valid showId is provided and user is authenticated', async () => {
      const showId = 309;
      const response = await makePlatformPublicRequestWithAuth(jwtToken, 2).get(
        `${showDetailsApi}?showId=${showId}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
    it('should return show details when valid showId is provided and user is not authenticated', async () => {
      const showId = 309;
      const response = await makePlatformPublicRequest(2).get(
        `${showDetailsApi}?showId=${showId}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
    it('should return show details with artistList on platform web only when valid showId is provided and user is authenticated', async () => {
      const showId = showData[2]._id;
      const response = await makePlatformPublicRequest(2)
        .get(`${showDetailsApi}?showId=${showId}`)
        .set('platform', Platform.WEB);
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
    it('should return show details without artistList on platform not web when valid showId is provided and user is authenticated', async () => {
      const showId = showData[2]._id;
      const response = await makePlatformPublicRequest(2).get(
        `${showDetailsApi}?showId=${showId}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`PATCH: ${microDramaInteractionApi}`, () => {
    it('should successfully like an episode when user is authenticated', async () => {
      const requestBody = {
        action: MicroDramaAction.LIKE,
        episodeSlug: 'test-episode-1',
        showSlug: 'test-show-1',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should successfully unlike an episode when user is authenticated', async () => {
      // First like the episode
      const likeRequestBody = {
        action: MicroDramaAction.LIKE,
        episodeSlug: 'test-episode-2',
        showSlug: 'test-show-1',
      };

      await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(likeRequestBody);

      // Then unlike it
      const unlikeRequestBody = {
        action: MicroDramaAction.LIKE,
        episodeSlug: 'test-episode-2',
        showSlug: 'test-show-1',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(unlikeRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should return success false for invalid action', async () => {
      const requestBody = {
        action: 'invalid-action',
        episodeSlug: 'test-episode-3',
        showSlug: 'test-show-1',
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(requestBody);

      expect(response.status).toBe(400);
    });

    it('should handle multiple episodes for the same show', async () => {
      const showSlug = 'test-show-multiple';

      // Like first episode
      const episode1Body = {
        action: MicroDramaAction.LIKE,
        episodeSlug: 'episode-1',
        showSlug,
      };

      const response1 = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(episode1Body);

      expect(response1.status).toBe(200);
      expect(response1.body).toEqual({ success: true });

      // Like second episode
      const episode2Body = {
        action: MicroDramaAction.LIKE,
        episodeSlug: 'episode-2',
        showSlug,
      };

      const response2 = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(episode2Body);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual({ success: true });
    });

    it('should validate required fields in request body', async () => {
      const invalidRequestBody = {
        action: MicroDramaAction.LIKE,
        // Missing episodeSlug and showSlug
      };

      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(microDramaInteractionApi)
        .send(invalidRequestBody);

      expect(response.status).toBe(400);
    });
  });
});
