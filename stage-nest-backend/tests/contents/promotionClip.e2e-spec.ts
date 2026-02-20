import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { Lang, Platform } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';

const promotionClipApi = '/contents/promotionClip';

describe('MODULE: Promotion Clip Tests', () => {
  let jwtToken: string;

  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });

  describe(`GET: ${promotionClipApi}`, () => {
    it('should return fallback promotion clip when no contentId and contentType provided', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(promotionClipApi)
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback promotion clip in Hindi when no contentId and contentType provided', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(promotionClipApi)
        .set('lang', Lang.HIN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip when movie contentId is not found (due to missing format field)', async () => {
      const contentId = 2; // Episode 2 has type: EpisodeType.Movie but missing format field
      const contentType = ContentType.MOVIE;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      // Should return fallback since the movie is not found due to missing format field
      expect(response.body).toMatchSnapshot();
    });

    it('should return show promotion clip for valid show contentId', async () => {
      const contentId = 7; // Using existing test data from shows seed
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toHaveProperty('descriptionText');
      expect(response.body.descriptionText).toContain('Show ·');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip when movie contentId is not found in Hindi', async () => {
      const contentId = 2;
      const contentType = ContentType.MOVIE;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.HIN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return show promotion clip in Hindi for valid show contentId', async () => {
      const contentId = 7;
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.HIN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toHaveProperty('descriptionText');
      expect(response.body.descriptionText).toContain('शो ·');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip for non-existent movie contentId', async () => {
      const contentId = 99999;
      const contentType = ContentType.MOVIE;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip for non-existent show contentId', async () => {
      const contentId = 99999;
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip when only contentId is provided without contentType', async () => {
      const contentId = 2;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${promotionClipApi}?contentId=${contentId}`)
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return fallback clip when only contentType is provided without contentId', async () => {
      const contentType = ContentType.MOVIE;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${promotionClipApi}?contentType=${contentType}`)
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should work with different platforms (WEB)', async () => {
      const contentId = 7;
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.WEB);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should work with different platforms (TV)', async () => {
      const contentId = 7;
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.TV);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should handle missing language and platform headers gracefully', async () => {
      const contentId = 7;
      const contentType = ContentType.SHOW;

      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('titleText');
      expect(response.body).toHaveProperty('infoText');
      expect(response.body).toHaveProperty('playbackURL');
      expect(response.body).toHaveProperty('thumbnailURL');
      expect(response.body).toMatchSnapshot();
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await makeAuthenticatedRequest('invalid_token')
        .get(promotionClipApi)
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(401);
      expect(response.body).toMatchSnapshot();
    });

    it('should handle invalid contentId format gracefully', async () => {
      const contentId = 'invalid';
      const contentType = ContentType.MOVIE;

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });

    it('should handle invalid contentType gracefully', async () => {
      const contentId = 7;
      const contentType = 'invalid';

      const response = await makeAuthenticatedRequest(jwtToken)
        .get(
          `${promotionClipApi}?contentId=${contentId}&contentType=${contentType}`,
        )
        .set('lang', Lang.EN)
        .set('platform', Platform.APP);

      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });
  });
});
