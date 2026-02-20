import { Injectable } from '@nestjs/common';

import axios from 'axios';

import {
  CultureSpecificEvents,
  EventType,
  Events,
} from '../interfaces/events.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class CleverTapEventService {
  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  async trackEvent(event: Events | CultureSpecificEvents, data: EventType) {
    return this.errorHandlerService.try(async () => {
      const options = {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-CleverTap-Account-Id': APP_CONFIGS.CLEVERTAP.MAIN.ACCOUNT_ID,
          'X-CleverTap-Passcode': APP_CONFIGS.CLEVERTAP.MAIN.PASSCODE,
        },
      };
      const body = {
        d: [
          {
            evtData: data.payload,
            evtName: event,
            identity: data.user_id,
            type: 'event',
          },
        ],
      };

      return axios.post(APP_CONFIGS.CLEVERTAP.URL, body, options);
    });
  }
}
