import {
  generateAuthToken,
  makeAuthenticatedRequest,
  makePlatformPublicRequest,
} from 'tests/utils/makeRequest';

const updateUserCultureApi = '/users/userCulture';

describe('MODULE: User Tests', () => {
  let jwtToken: string;
  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });

  describe(`PATCH: ${updateUserCultureApi}`, () => {
    it('should return users updated culture details', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(`${updateUserCultureApi}`)
        .send({
          userCulture: 'har',
        });
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return 404 if user culture is invalid', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(`${updateUserCultureApi}`)
        .send({
          userCulture: 'ABC',
        });
      expect(response.status).toBe(404);
      expect(response.body).toMatchSnapshot();
    });

    it('should not update initialUserCulture if it is not null', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .patch(`${updateUserCultureApi}`)
        .send({
          userCulture: 'raj',
        });
      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });

    it('should return 400 if not authenticated', async () => {
      const response = await makePlatformPublicRequest()
        .patch(`${updateUserCultureApi}`)
        .send({
          userCulture: 'har',
        });
      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });
  });
});
