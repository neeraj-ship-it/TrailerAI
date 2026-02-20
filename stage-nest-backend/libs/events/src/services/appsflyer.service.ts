import { Injectable, Logger } from '@nestjs/common';

import axios, { AxiosError } from 'axios';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ClientAppIdEnum, CurrencyEnum, OS } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import {
  CultureSpecificEvents,
  Events,
} from '@app/events/interfaces/events.interface';

export interface AppsFlyerEventPayload {
  advertising_id: string;
  amazon_aid?: string;
  app_instance_id?: string;
  app_store?: string;
  app_version_name?: string;
  appsflyer_id: string;
  bundleIdentifier: string;
  customer_user_id: string;
  event_id?: string;
  eventCurrency?: CurrencyEnum;
  eventName: Events | CultureSpecificEvents;
  eventValue: Record<string, unknown>;
  imei?: string;
  ip?: string;
  oaid?: string; //Todo: Verify this with @hemabh
  os?: OS;
  ua?: string;
}

@Injectable()
export class AppsFlyerEventService {
  private readonly logger = new Logger(AppsFlyerEventService.name);
  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  private getAppsFlyerURL(appId: ClientAppIdEnum) {
    return appId === ClientAppIdEnum.IOS_MAIN
      ? `${APP_CONFIGS.APPSFLYER.BASE_URL}/id${appId}`
      : `${APP_CONFIGS.APPSFLYER.BASE_URL}/${appId}`;
  }

  async trackEvent(data: AppsFlyerEventPayload, appId: ClientAppIdEnum | null) {
    if (!appId) {
      throw Errors.UNSUPPORTED_FUNCTIONALITY(
        'app id is required for appsflyer event!',
      );
    }

    const url = this.getAppsFlyerURL(appId);

    const [response, error] = await this.errorHandlerService.try<
      unknown,
      AxiosError
    >(() =>
      (async () => {
        const res = await axios.post<AppsFlyerEventPayload>(url, data, {
          headers: {
            authentication: APP_CONFIGS.APPSFLYER.SECRET,
          },
        });
        return res.data;
      })(),
    );
    if (error) {
      this.logger.error(error, 'error in sending event to appsflyer');
    } else {
      this.logger.error({ data }, 'Appsflyer Event sent successfully');
    }
    return response;
  }
}
