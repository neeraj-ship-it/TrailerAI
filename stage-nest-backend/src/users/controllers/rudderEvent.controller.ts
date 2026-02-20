import { Body, Controller, Post } from '@nestjs/common';

import type { TrackParams } from '@rudderstack/rudder-sdk-node';

import { Internal } from '@app/auth';
import { RudderStackEventService } from '@app/events/services/rudderstack.service';

@Controller('rudder-events')
export class RudderEventController {
  constructor(
    private readonly rudderStackEventService: RudderStackEventService,
  ) {}

  @Post('track')
  @Internal()
  async trackEvent(@Body() trackParams: TrackParams) {
    await this.rudderStackEventService.trackRawEvent(trackParams);
    return { message: 'Event tracked successfully', success: true };
  }
}
