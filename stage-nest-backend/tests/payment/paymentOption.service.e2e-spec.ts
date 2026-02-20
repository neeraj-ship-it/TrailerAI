import { paymetOptionsSeed } from '../seeds/paymentOptions';
import { generateAuthToken } from '../utils/makeRequest';
import { makeAuthenticatedRequest } from '../utils/makeRequest';
import { Lang, OS } from 'common/enums/app.enum';

const paymentOptionServiceApi = '/payments/payment-options';

describe('MODULE: Payment Option Service Tests', () => {
  let jwtToken: string;

  beforeAll(async () => {
    jwtToken = await generateAuthToken();
  });

  describe(`POST: ${paymentOptionServiceApi}`, () => {
    it('should return valid data for case 1 with all three apps installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[0]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 2 with GPay and Paytm installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[1]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 3 with GPay and PhonePe installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[2]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 4 with PhonePe and Paytm installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[3]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 5 with only PhonePe installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[4]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 6 with only Paytm installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[5]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 7 with only GPay installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[6]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return valid data for case 8 with no apps installed', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[7]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSnapshot();
    });

    it('should return bad request for case 9 with invalid package names', async () => {
      const response = await makeAuthenticatedRequest(jwtToken)
        .post(`${paymentOptionServiceApi}`)
        .set('lang', Lang.EN)
        .set('os', OS.ANDROID)
        .send(paymetOptionsSeed[8]);

      expect(response.status).toBe(400);
      expect(response.body).toMatchSnapshot();
    });
  });
});
