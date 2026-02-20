import { makePlatformPublicRequest } from '../utils/makeRequest';
import { Lang } from 'common/enums/app.enum';

const movieDetailsApi = '/contents/movies/details';
const allMoviesApi = '/contents/movies/all';

describe('MODULE: Movies Tests', () => {
  describe(`GET: ${movieDetailsApi}`, () => {
    it('should return movie details when valid movieId is provided', async () => {
      const movieId = 171;
      const response = await makePlatformPublicRequest().get(
        `${movieDetailsApi}?movieId=${movieId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return movie details when valid movieId is provided in english', async () => {
      const movieId = 171;
      const response = await makePlatformPublicRequest()
        .get(`${movieDetailsApi}?movieId=${movieId}`)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return error when movie is not found', async () => {
      const movieId = 999;
      const response = await makePlatformPublicRequest().get(
        `${movieDetailsApi}?movieId=${movieId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toMatchSnapshot();
    });

    it('should return movie details with watchProgress for previously watched movie', async () => {
      const movieId = 171;
      const response = await makePlatformPublicRequest().get(
        `${movieDetailsApi}?movieId=${movieId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`GET: ${allMoviesApi}`, () => {
    it('should return all paginated movies', async () => {
      const response = await makePlatformPublicRequest().get(
        `${allMoviesApi}?page=1&limit=10`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return all paginated movies with english title', async () => {
      const response = await makePlatformPublicRequest()
        .get(`${allMoviesApi}?page=1&limit=10`)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });
});
