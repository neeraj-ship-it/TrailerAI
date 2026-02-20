import { ClientAppIdEnum } from '@app/common/enums/app.enum';

export interface IAppUninstallEventDto {
  name: 'app_remove';
  params?: Record<string, unknown>;
  reportingDate?: string;
  user: {
    appInfo: {
      appId: ClientAppIdEnum;
      appInstanceId: string;
      appPlatform: string;
      appStore: string;
      appVersion: string;
    };
    bundleInfo?: Record<string, unknown>;
    deviceInfo?: Record<string, unknown>;
    firstOpenTime?: string;
    geoInfo?: Record<string, unknown>;
    userId: string;
    userProperties?: Record<string, unknown>;
  };
}

export interface DeviceDetailsDto {
  countryCode: string;
  primaryMobileNumber: string;
}
