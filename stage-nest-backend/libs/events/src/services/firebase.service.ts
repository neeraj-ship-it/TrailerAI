import { Injectable, Logger } from '@nestjs/common';

import qs from 'querystring';

import axios from 'axios';

import { FirebaseEventPayload } from '../interfaces/event-platforms.interface';
import { CultureSpecificEvents, Events } from '../interfaces/events.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ClientAppIdEnum } from '@app/common/enums/app.enum';
import { Errors } from '@app/error-handler';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class FirebaseEventService {
  private readonly logger = new Logger(FirebaseEventService.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  private getApiSecret(appId: string): string {
    if (appId === ClientAppIdEnum.WEB)
      return APP_CONFIGS.FIREBASE.WEB.API_SECRET;

    const apiSecret =
      appId === ClientAppIdEnum.IOS_MAIN
        ? APP_CONFIGS.FIREBASE.IOS.API_SECRET
        : APP_CONFIGS.FIREBASE.MAIN.API_SECRET;

    if (!apiSecret) {
      throw new Error('Firebase API secret not configured');
    }
    return apiSecret;
  }

  private getFirebaseAppId(appId: ClientAppIdEnum): string {
    const firebaseAppId =
      appId === ClientAppIdEnum.IOS_MAIN
        ? APP_CONFIGS.FIREBASE.IOS.APP_ID
        : APP_CONFIGS.FIREBASE.MAIN.APP_ID;

    if (!firebaseAppId) {
      throw new Error('Firebase App ID not configured');
    }
    return firebaseAppId;
  }

  async trackEvent(
    event: Events | CultureSpecificEvents,
    data: FirebaseEventPayload,
  ) {
    return this.errorHandlerService.try(async () => {
      if (!data.appId) {
        const errMsg = 'required data missing for firebase event!';
        this.logger.warn({ data }, errMsg);
        throw Errors.UNSUPPORTED_FUNCTIONALITY(errMsg);
      }

      if (!data.firebaseAppInstanceId && !data.firebaseClientId) {
        const errMsg = 'required firebase id missing for firebase event!';
        this.logger.warn({ data }, errMsg);
        throw Errors.UNSUPPORTED_FUNCTIONALITY(errMsg);
      }

      const { MEASUREMENT_ID } = APP_CONFIGS.FIREBASE;

      const params = {
        api_secret: this.getApiSecret(data.appId),
        ...(data.appId === ClientAppIdEnum.WEB
          ? { measurement_id: MEASUREMENT_ID }
          : { firebase_app_id: this.getFirebaseAppId(data.appId) }),
      };

      const queryString = qs.stringify(params);
      const url = `${APP_CONFIGS.FIREBASE.BASE_URL}?${queryString}`;
      const options = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      delete data.properties.platforms;
      const body = {
        ...(data.appId === ClientAppIdEnum.WEB
          ? { client_id: data.firebaseClientId }
          : { app_instance_id: data.firebaseAppInstanceId }),
        events: [
          {
            name: event,
            params: {
              userId: data.userId,
              ...data.properties,
            },
          },
        ],
      };
      return axios.post(url, body, options);
    });
  }
}
