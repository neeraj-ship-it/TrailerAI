import {
  generateAuthToken,
  makeAuthenticatedRequest,
  makePlatformPublicRequest,
} from '../utils/makeRequest';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { ContentFormat } from 'common/entities/contents.entity';

const allContentApi = '/contents/allContents';
const groupByGenreApi = '/contents/groupByGenre';
const slugByContentId = '/contents/slugByContentId';
const microDramasApi = '/contents/microDramas';

describe('MODULE: All Content  Tests', () => {
  let jwtToken: string;
  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });
  describe(`GET: ${allContentApi}`, () => {
    it('should return all content details irrespective of user', async () => {
      const response = await makePlatformPublicRequest().get(
        `${allContentApi}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`GET: ${groupByGenreApi}`, () => {
    const dialect = Dialect.HAR;
    const lang = Lang.EN;
    const genreId = 1;
    it('should return genre data for a specific dialect and language', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${groupByGenreApi}?genreId=${genreId}`)
        .set('dialect', dialect)
        .set('lang', lang);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return genre data for a specific dialect, language and movie', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${groupByGenreApi}?type=${ContentType.MOVIE}`)
        .set('dialect', dialect)
        .set('lang', lang);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return genre data for a specific dialect, language and show', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${groupByGenreApi}?type=${ContentType.SHOW}`)
        .set('dialect', dialect)
        .set('lang', lang);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should handle multiple genres correctly', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${groupByGenreApi}`)
        .set('dialect', dialect)
        .set('lang', lang);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`GET: ${slugByContentId}`, () => {
    const contentId = 17;
    const microDramaContentId = 1001;
    const nonExistingContentId = 9999;
    const type = ContentType.MOVIE;
    it('should return slug data for a specific contentId', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${slugByContentId}?contentId=${contentId}&type=${type}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return show slug data for a specific micro drama contentId', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${slugByContentId}?contentId=${microDramaContentId}&format=${ContentFormat.MICRO_DRAMA}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return bad request for format other than microdrama', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${slugByContentId}?contentId=${contentId}&format=${ContentFormat.STANDARD}`,
      );

      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });

    it('should return not found bad request for any random contentId', async () => {
      const response = await makeAuthenticatedRequest(jwtToken).get(
        `${slugByContentId}?contentId=${nonExistingContentId}&type=${type}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`GET: ${microDramasApi}`, () => {
    it('should return micro dramas for authenticated user with Hindi dialect and English language', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(microDramasApi)
        .set('dialect', Dialect.HAR)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return micro dramas for authenticated user with Bhojpuri dialect and Hindi language', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(microDramasApi)
        .set('dialect', Dialect.BHO)
        .set('lang', Lang.HIN);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toMatchSnapshot();
    });

    it('should return 400 for micro dramas for platform public request', async () => {
      const response = await makePlatformPublicRequest().get(microDramasApi);

      expect(response.status).toBe(400);
    });

    it('should return empty array when no micro dramas exist for given dialect and language', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(microDramasApi)
        .set('dialect', Dialect.RAJ)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toMatchSnapshot();
    });

    it('should limit results to 20 micro dramas sorted by release date', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(microDramasApi)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
      expect(response.body).toMatchSnapshot();
    });

    it('should return 404 when no micro dramas found', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(microDramasApi)
        .set('dialect', Dialect.RAJ)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should handle missing dialect and language headers gracefully', async () => {
      const response =
        await makeAuthenticatedRequest(jwtToken).get(microDramasApi);

      expect(response.status).toBe(404);
      expect(response.body).toMatchSnapshot();
    });
  });
});
