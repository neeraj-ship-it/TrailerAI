import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import ky from 'ky';

import { PhonePeUptimeResponse } from '../interfaces/phonePeUptimeResponse';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
@Injectable()
export class PhonePeHealthIndicator extends HealthIndicator {
  private readonly xVerifyToken: string;
  constructor(private readonly errorHandlerService: ErrorHandlerService) {
    super();
    this.xVerifyToken = APP_CONFIGS.PLATFORM.PHONEPE_HEALTH_X_VERIFY;
  }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const [phonePeHealth] = await this.errorHandlerService.try(
      () =>
        ky
          .get<PhonePeUptimeResponse>(
            'https://uptime.phonepe.com/v1/pg/merchants/STAGEONLINE/health',
            {
              headers: {
                'X-VERIFY': this.xVerifyToken,
              },
            },
          )
          .json(),
      () => Errors.EXTERNAL_API_ERROR('PhonePe health check failed'),
    );
    const result = this.getStatus(key, phonePeHealth.overallHealth === 'UP', {
      phonePeHealth,
    });
    return result;
  }
}
