import { Injectable } from '@nestjs/common';

import { createInstance } from '@amplitude/analytics-node';

// import ky from 'ky';

import axios from 'axios';

import { AmplitudeEventPayload } from '../interfaces/event-platforms.interface';
import { CultureSpecificEvents, Events } from '../interfaces/events.interface';
import { NodeClient } from '@amplitude/analytics-types';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ClientAppIdEnum } from '@app/common/enums/app.enum';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class AmplitudeEventService {
  private map = new Map<ClientAppIdEnum, NodeClient>([
    [ClientAppIdEnum.ANDROID_MAIN, createInstance()],
  ]);
  constructor(private readonly errorHandlerService: ErrorHandlerService) {
    const androidMain = this.errorHandlerService.raiseErrorIfNull(
      this.map.get(ClientAppIdEnum.ANDROID_MAIN),
      new Error(`Tracker not found for ${ClientAppIdEnum.ANDROID_MAIN}`),
    );
    androidMain.init(APP_CONFIGS.AMPLITUDE.MAIN_APP_API_KEY);
  }

  async trackEvent(
    event: Events | CultureSpecificEvents,
    payload: AmplitudeEventPayload,
  ) {
    const data = {
      event_properties: payload.eventProperties,
      event_type: event,
      user_id: payload.userId,
      user_properties: payload.userProperties,
    };

    const body = {
      api_key: APP_CONFIGS.AMPLITUDE.MAIN_APP_API_KEY,
      events: [data],
    };

    return axios.post(APP_CONFIGS.AMPLITUDE.API_URL, body);
  }
}
