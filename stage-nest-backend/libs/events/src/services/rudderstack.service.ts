import { Injectable, Logger } from '@nestjs/common';
import Analytics, { TrackParams } from '@rudderstack/rudder-sdk-node';

import { RudderStackPayload } from '../interfaces/event-platforms.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';

@Injectable()
export class RudderStackEventService {
  private readonly logger = new Logger(RudderStackEventService.name);
  private rudderStackClient;
  constructor(private readonly errorHandlerService: ErrorHandlerService) {
    const { DATA_PLANE_URL, FLUSH_AT, FLUSH_INTERVAL, WRITE_KEY } =
      APP_CONFIGS.RUDDERSTACK;

    this.rudderStackClient = new Analytics(WRITE_KEY, {
      dataPlaneUrl: DATA_PLANE_URL,
      flushAt: FLUSH_AT, // Set the batch size
      flushInterval: FLUSH_INTERVAL, // Flush every 10 seconds regardless of batch size
    });
  }

  // Optional: Manual flush method if we need to force sending events
  async flushEvents() {
    return this.errorHandlerService.try(async () => {
      return this.rudderStackClient.flush();
    });
  }

  async trackEvent(data: RudderStackPayload) {
    return this.errorHandlerService.try(async () => {
      const { email, event, os, osVersion, phone, properties, userId } = data;
      return this.rudderStackClient.track({
        // context is required for Facebook Conversion API
        context: {
          device: {
            adTrackingEnabled: true,
            type: os,
          },
          os: {
            version: osVersion, // TODO: Get the version from the app
          },
          traits: {
            email,
            phone,
          },
        },
        event,
        properties: {
          ...properties,
          application_tracking_enabled: true,
        },
        timestamp: new Date(),
        userId,
      });
    });
  }

  async trackRawEvent(data: TrackParams) {
    data.timestamp = undefined;
    return this.errorHandlerService.try(async () => {
      this.rudderStackClient.track(data);
      this.logger.error(`rudderstack trackRawEvent`);
      return { success: true };
    });
  }
}
