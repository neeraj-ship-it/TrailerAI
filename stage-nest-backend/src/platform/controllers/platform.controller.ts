import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

import { TestNumberEnum } from '../dtos/test-numbers.enum';
import { PhonePeHealthIndicator } from '../services/phonePe.service';
import { PlatformService } from '../services/platform.service';
import { PlatformPublic, Public } from '@app/auth';

@Controller('')
export class PlatformController {
  constructor(
    private health: HealthCheckService,
    private mongo: MongooseHealthIndicator,
    private phonePeIndicator: PhonePeHealthIndicator,
    private platformService: PlatformService,
  ) {}

  @TypedRoute.Patch('test/numbers')
  @PlatformPublic()
  bookTestNumbers(
    @TypedBody() body: { type?: TestNumberEnum; numbers: string[] },
  ): Promise<string[]> {
    return this.platformService.bookTestNumbers(body);
  }

  @TypedRoute.Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongo.pingCheck('mongoDB', { timeout: 3000 }),
      // () => this.phonePeIndicator.isHealthy('phonePe'), // Disabled for now due to false alarms
    ]);
  }

  @TypedRoute.Get('action/clearCache')
  @Public()
  clearCache(): Promise<unknown> {
    return this.platformService.clearCache();
  }
}
