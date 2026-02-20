import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { Lang, Dialect } from 'common/enums/app.enum';

const comingSoonApi = '/contents/upcoming';

describe('MODULE: Upcoming Section Tests', () => {
  let jwtToken: string;

  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });

  describe(`GET: ${comingSoonApi}`, () => {
    it('should return valid data with at least array length 1', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${comingSoonApi}`)
        .set('lang', Lang.EN)
        .set('dialect', Dialect.HAR);

      // const contentLength = response.body.comingSoonListing.length;
      expect(response.status).toBe(200);
      // expect(contentLength).toBeGreaterThan(0);
      expect(response.body).toMatchSnapshot();
    });
    it('should return  data with the correct format sorted by specific date provided', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .get(`${comingSoonApi}`)
        .set('lang', Lang.EN)
        .set('dialect', Dialect.HAR);

      const contentLength = response.body.comingSoonListing.length;
      expect(response.status).toBe(200);
      expect(response.body.comingSoonListing.length).not.toEqual(0);
      expect(response.body).toMatchSnapshot();

      const comingSoonListing = response.body.comingSoonListing;

      if (contentLength > 1) {
        const firstReleaseDate = new Date(
          comingSoonListing[0].releaseDate,
        ).getTime();
        const secondReleaseDate = new Date(
          comingSoonListing[1].releaseDate,
        ).getTime();

        expect(secondReleaseDate).toBeGreaterThanOrEqual(firstReleaseDate);
      }
    });
  });
});
