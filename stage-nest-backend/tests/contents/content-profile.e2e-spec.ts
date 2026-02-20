import {
  generateAuthToken,
  makeAuthenticatedRequest,
} from '../utils/makeRequest';
import { Dialect, OS, Lang, Platform } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { LikeStatusEnum } from 'src/content/entities/contentProfile.entity';
import { userData } from 'tests/seeds/user';

const contentProfileApi = '/contents/content-profile';

describe('MODULE: Content Profile Tests', () => {
  let jwtToken: string;

  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });

  describe(`GET: ${contentProfileApi}/liked-content`, () => {
    it('should return user liked content with correct format', async () => {
      const token = await generateAuthToken({
        userId: userData[3]._id.toString(),
      });
      const response = await makeAuthenticatedRequest(token)
        .get(`${contentProfileApi}/liked-content`)
        .set('Authorization', `Bearer ${token}`)
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        likedContent: [],
      });
    });

    it('should return empty liked content for new user', async () => {
      const newUserToken = await generateAuthToken({
        userId: userData[3]._id.toString(),
      });
      const response = await makeAuthenticatedRequest(newUserToken)
        .get(`${contentProfileApi}/liked-content`)
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        likedContent: [],
      });
    });
  });

  describe(`POST: ${contentProfileApi}/like-content`, () => {
    it('should update the liked content status successfully', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${contentProfileApi}/like-content`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN)
        .send({
          contentType: 'show',
          slug: 'prem-nagar',
          status: 'superlike',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        updatedStatus: 'superlike',
      });
    });

    it('should give error if the user profile is not found while interaction', async () => {
      const token = await generateAuthToken({
        userId: userData[1]._id.toString(),
      });
      const response = await makeAuthenticatedRequest(token)
        .post(`${contentProfileApi}/like-content`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN)
        .send({
          contentType: ContentType.SHOW,
          slug: 'mewat12', //this is wrong slug
          status: LikeStatusEnum.DISLIKE,
        });

      expect(response.status).toBe(410);
      expect(response.body).toEqual({
        message: 'USER_PROFILE_NOT_FOUND',
        statusCode: 410,
      });
    });

    it('should return 401 for unauthorized request', async () => {
      const response = await makeAuthenticatedRequest('invalid_token')
        .post(`${contentProfileApi}/like-content`)
        .set('Content-Type', 'application/json')
        .set('dialect', 'har')
        .set('os', 'android')
        .set('platform', 'app')
        .set('lang', 'en')
        .send({
          contentType: ContentType.SHOW,
          slug: 'show-444',
          status: LikeStatusEnum.SUPERLIKE,
        });

      expect(response.status).toBe(401);
    });

    it('should update existing like status to a different status', async () => {
      const userToken = await generateAuthToken({
        userId: userData[0]._id.toString(),
      });
      const response = await makeAuthenticatedRequest(userToken)
        .post(`${contentProfileApi}/like-content`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN)
        .send({
          contentType: ContentType.SHOW,
          slug: 'prem-nagar',
          status: LikeStatusEnum.SUPERLIKE,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        updatedStatus: LikeStatusEnum.SUPERLIKE,
      });

      const profileResponse = await makeAuthenticatedRequest(userToken)
        .get(`${contentProfileApi}/liked-content`)
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN);

      expect(profileResponse.body.likedContent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contentType: ContentType.SHOW,
            dialect: Dialect.HAR,
            slug: 'prem-nagar',
            status: LikeStatusEnum.SUPERLIKE,
          }),
        ]),
      );
    });
  });

  describe(`POST: ${contentProfileApi}/remove-like-content`, () => {
    it('should handle removing non-existent content while interaction giving gone for non existing user profile', async () => {
      const userToken = await generateAuthToken({
        userId: userData[3]._id.toString(), //this is wrong userId
      });
      const response = await makeAuthenticatedRequest(userToken)
        .post(`${contentProfileApi}/remove-like-content`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .set('dialect', Dialect.HAR)
        .set('os', OS.ANDROID)
        .set('platform', Platform.APP)
        .set('lang', Lang.EN)
        .send({
          contentType: ContentType.SHOW,
          slug: 'non-existent-show', //this is wrong slug
          status: LikeStatusEnum.SUPERLIKE,
        });

      expect(response.status).toBe(410);
      expect(response.body).toEqual({
        message: 'USER_PROFILE_NOT_FOUND',
        statusCode: 410,
      });
    });
  });
});
