import { ClientAppIdEnum } from '@app/common/enums/app.enum';
import { IAppUninstallEventDto } from 'src/users/dtos/user.dto';
import { makeInternalRequest } from 'tests/utils/makeRequest';

const uninstallEventApi = '/users/event/captureUninstall';

const payload: IAppUninstallEventDto = {
  name: 'app_remove',
  params: {
    firebase_conversion: 1,
    firebase_event_origin: 'auto',
    ga_session_id: 1736754920,
    ga_session_number: 2,
    session_duration: 1223,
  },
  reportingDate: '20250130',
  user: {
    appInfo: {
      appId: ClientAppIdEnum.ANDROID_MAIN,
      appInstanceId: 'dc04db41553c65f2ccc366b1fd2b657a',
      appPlatform: 'ANDROID',
      appStore: 'com.android.vending',
      appVersion: '3.35.0',
    },
    bundleInfo: { bundleSequenceId: 32, serverTimestampOffset: 0 },
    deviceInfo: {
      deviceCategory: 'mobile',
      deviceModel: 'RMX2001',
      deviceTimeZoneOffsetSeconds: 19800,
      mobileBrandName: 'Realme',
      mobileMarketingName: '6',
      mobileModelName: 'RMX2001',
      platformVersion: '11',
      resettableDeviceId: '00000000-0000-0000-0000-000000000000',
      userDefaultLanguage: 'en-gb',
    },
    firstOpenTime: '2025-01-03T01:34:22.746Z',
    geoInfo: {
      city: 'Bhubaneswar',
      continent: '034',
      country: 'India',
      region: 'Odisha',
    },
    userId: '5f7c6b5e1c9d440000a1b1a1',
    userProperties: {
      app_id: { setTime: '2025-01-13T07:55:43.666Z', value: 'in.stage' },
      ct_objectId: {
        setTime: '2025-01-13T07:55:43.741Z',
        value: '__24dc054b94a744678da352147dbc6b31',
      },
      email_id: { setTime: '2025-01-13T07:55:43.735Z', value: 'none' },
      first_app_id: {
        setTime: '2025-01-13T07:55:43.741Z',
        value: 'in.stage',
      },
      first_app_version: {
        setTime: '2025-01-13T07:55:43.740Z',
        value: '3.34.6',
      },
      first_device_family: {
        setTime: '2025-01-13T07:55:43.735Z',
        value: 'realme',
      },

      first_device_id: {
        setTime: '2025-01-13T07:55:43.740Z',
        value: '548f12de33e531e5',
      },
      first_device_model: {
        setTime: '2025-01-13T07:55:43.744Z',
        value: 'RMX2001',
      },
      first_device_type: {
        setTime: '2025-01-13T07:55:43.749Z',
        value: 'mobile',
      },
      first_dialect: { setTime: '2025-01-13T07:55:43.734Z', value: 'raj' },
      first_open_time: { setTime: '2025-01-13T07:55:43.666Z', value: '' },
      first_platform: { setTime: '2025-01-13T07:55:43.666Z', value: 'app' },
      gender: { setTime: '2025-01-13T07:55:43.666Z', value: 'NA' },
      OS: { setTime: '2025-01-13T07:55:43.740Z', value: 'android' },
      OS_version: { setTime: '2025-01-13T07:55:43.740Z', value: '11' },
      Phone: { setTime: '2025-01-13T07:55:43.663Z', value: '+919337269176' },
      phone_number: {
        setTime: '2025-01-13T07:55:43.738Z',
        value: '+919337269176',
      },
      user_id: {
        setTime: '2025-01-13T07:55:43.061Z',
        value: '5f7c6b5e1c9d440000a1b1a1',
      },
      year_of_birth: { setTime: '2025-01-13T07:55:43.741Z', value: 'NA' },
    },
  },
};

describe('MODULE: App Uninstall Event Tests', () => {
  beforeAll(async () => {
    // Data is now seeded globally during test setup
  });
  afterAll(async () => {
    // Cleanup is handled globally during test teardown
  });

  describe(`PATCH: ${uninstallEventApi}`, () => {
    it('should successfully track app uninstall for user with subscription', async () => {
      const response = await makeInternalRequest()
        .patch(uninstallEventApi)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchSnapshot();
    });
  });
});
