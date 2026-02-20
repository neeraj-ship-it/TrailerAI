import { userData } from '../seeds/user';
import { makePlatformPublicRequest } from '../utils/makeRequest';

const checkDeviceApi = '/users/check-device';

describe('MODULE: Check Device Tests', () => {
  describe(`GET: ${checkDeviceApi}`, () => {
    it('should return user data for valid deviceId', async () => {
      const deviceId = userData[0].deviceId; // 'device-123456'

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        primaryMobileNumber: expect.any(String),
      });
      expect(response.body.data.primaryMobileNumber).toBe(
        userData[0].primaryMobileNumber,
      );
    });

    it('should return countryCode and primaryMobileNumber', async () => {
      const deviceId = userData[0].deviceId;

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('countryCode');
      expect(response.body.data).toHaveProperty('primaryMobileNumber');
    });

    it('should return correct countryCode value', async () => {
      const deviceId = userData[0].deviceId;

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.countryCode).toBe('+91');
    });

    // it('should return 404 when deviceId header is missing', async () => {
    //   const response = await makePlatformPublicRequest().get(checkDeviceApi);

    //   expect(response.status).toBe(404);
    //   expect(response.body).toHaveProperty('statusCode', 404);
    // });

    it('should return 404 when deviceId header is empty string', async () => {
      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', '');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 404 when deviceId header is whitespace only', async () => {
      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', '   ');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 404 for non-existent deviceId', async () => {
      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', 'non-existent-device-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should work with different deviceId from seeded data', async () => {
      // Use second user if available
      if (userData.length > 1 && userData[1].deviceId) {
        const deviceId = userData[1].deviceId;

        const response = await makePlatformPublicRequest()
          .get(checkDeviceApi)
          .set('deviceId', deviceId);

        expect(response.status).toBe(200);
        expect(response.body.data.primaryMobileNumber).toBe(
          userData[1].primaryMobileNumber,
        );
      }
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      const deviceId = userData[0].deviceId;

      // No Authorization header needed
      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should return data wrapped in envelope structure', async () => {
      const deviceId = userData[0].deviceId;

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      // Envelope structure: { data: { ... } }
      expect(response.body).toMatchObject({
        data: expect.objectContaining({
          primaryMobileNumber: expect.any(String),
        }),
      });
    });

    it('should handle case-insensitive deviceId header', async () => {
      const deviceId = userData[0].deviceId;

      // Fastify lowercases headers, so 'deviceId' becomes 'deviceid'
      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('DeviceId', deviceId ?? ''); // Different case

      expect(response.status).toBe(200);
      expect(response.body.data.primaryMobileNumber).toBe(
        userData[0].primaryMobileNumber,
      );
    });

    it('should match snapshot for successful response', async () => {
      const deviceId = userData[0].deviceId;

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.body).toMatchSnapshot();
    });

    it('should return only expected fields in response', async () => {
      const deviceId = userData[0].deviceId;

      const response = await makePlatformPublicRequest()
        .get(checkDeviceApi)
        .set('deviceId', deviceId ?? '');

      expect(response.status).toBe(200);
      const { data } = response.body;

      // Check that response contains only expected fields (API returns countryCode and primaryMobileNumber)
      const allowedFields = ['primaryMobileNumber', 'countryCode'];
      const responseFields = Object.keys(data);

      responseFields.forEach((field) => {
        expect(allowedFields).toContain(field);
      });

      // Ensure sensitive fields are NOT exposed
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('_id');
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('otp');
    });
  });
});
