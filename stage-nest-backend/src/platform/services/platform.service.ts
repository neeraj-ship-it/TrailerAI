import { Injectable, Logger } from '@nestjs/common';

import { TestNumberEnum } from '../dtos/test-numbers.enum';
import { CloudfrontService } from './cloudfront.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Errors } from '@app/error-handler';
import { CacheManagerService } from 'libs/cache-manager/src';
@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  constructor(
    private readonly cacheManager: CacheManagerService,
    private readonly cloudfrontService: CloudfrontService,
  ) {}

  private generateTestNumbers(
    start: number,
    end: number,
    pattern: string,
  ): string[] {
    const numbers: string[] = [];
    for (let i = start; i <= end; i++) {
      numbers.push(`${pattern}${i.toString().padStart(2, '0')}`);
    }
    return numbers;
  }
  private async invalidateCloudfront(): Promise<string> {
    if (!APP_CONFIGS.PLATFORM.IS_PRODUCTION) {
      return 'skipped';
    }

    const invalidation = await this.cloudfrontService.createInvalidation();
    return invalidation?.Invalidation?.Id ?? 'failed';
  }

  async bookTestNumbers(body: { type?: TestNumberEnum; numbers: string[] }) {
    const {
      IS_PRODUCTION,
      SUBSCRIBED_NUMBERS,
      TEST_NUMBERS_PATTERN,
      TRIAL_EXPIRED_NUMBERS,
      TRIAL_NUMBERS,
      TRIAL_PAUSED_NUMBERS,
      UNSUBSCRIBED_NUMBERS,
    } = APP_CONFIGS.PLATFORM;

    if (IS_PRODUCTION)
      throw Errors.UNSUPPORTED_FUNCTIONALITY(
        'Not supported in Production environment',
      );
    const subscribedNumbers = this.generateTestNumbers(
      SUBSCRIBED_NUMBERS.START_NUMBER_CODE,
      SUBSCRIBED_NUMBERS.END_NUMBER_CODE,
      TEST_NUMBERS_PATTERN,
    );
    const unsubscribedNumbers = this.generateTestNumbers(
      UNSUBSCRIBED_NUMBERS.START_NUMBER_CODE,
      UNSUBSCRIBED_NUMBERS.END_NUMBER_CODE,
      TEST_NUMBERS_PATTERN,
    );
    const trialNumbers = this.generateTestNumbers(
      TRIAL_NUMBERS.START_NUMBER_CODE,
      TRIAL_NUMBERS.END_NUMBER_CODE,
      TEST_NUMBERS_PATTERN,
    );
    const trialExpiredNumbers = this.generateTestNumbers(
      TRIAL_PAUSED_NUMBERS.START_NUMBER_CODE,
      TRIAL_PAUSED_NUMBERS.END_NUMBER_CODE,
      TEST_NUMBERS_PATTERN,
    );
    const trialExpiredNums = this.generateTestNumbers(
      TRIAL_EXPIRED_NUMBERS.START_NUMBER_CODE,
      TRIAL_EXPIRED_NUMBERS.END_NUMBER_CODE,
      TEST_NUMBERS_PATTERN,
    );

    const { numbers, type } = body;
    const key = 'locked_test_numbers';

    const lockedNumbers: string[] = (await this.cacheManager.get(key)) ?? [];

    if (numbers.length !== 0 && !type) {
      const freshLockedNumbers = lockedNumbers.filter(
        (number) => !numbers.includes(number),
      );
      this.cacheManager.set(
        key,
        freshLockedNumbers,
        APP_CONFIGS.CACHE.TTL.FIVE_MINS,
      );
      return [];
    }

    let availableNumbers: string[] = [];

    switch (type) {
      case TestNumberEnum.SUBSCRIBED: {
        availableNumbers = subscribedNumbers.filter(
          (number) => !lockedNumbers.includes(number),
        );
        break;
      }
      case TestNumberEnum.UNSUBSCRIBED: {
        availableNumbers = unsubscribedNumbers.filter(
          (number) => !lockedNumbers.includes(number),
        );
        break;
      }
      case TestNumberEnum.TRIAL: {
        availableNumbers = trialNumbers.filter(
          (number) => !lockedNumbers.includes(number),
        );
        break;
      }
      case TestNumberEnum.TRIAL_PAUSED: {
        availableNumbers = trialExpiredNumbers.filter(
          (number) => !lockedNumbers.includes(number),
        );
        break;
      }
      case TestNumberEnum.TRIAL_EXPIRED: {
        availableNumbers = trialExpiredNums.filter(
          (number) => !lockedNumbers.includes(number),
        );
        break;
      }
    }

    if (availableNumbers.length === 0) {
      throw Errors.PLATFORM.TEST_NUMBERS_NOT_AVAILABLE();
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    lockedNumbers.push(number);

    await this.cacheManager.set(
      key,
      lockedNumbers,
      APP_CONFIGS.CACHE.TTL.FIVE_MINS,
    );
    return [number];
  }

  async clearCache() {
    const redisResult = await this.cacheManager
      .deleteByPattern('*')
      .catch((error) => {
        this.logger.error({ error }, 'Redis cache clear failed');
        return 'failed';
      });

    const cfResult = await this.invalidateCloudfront().catch((error) => {
      this.logger.error({ error }, 'Cloudfront invalidation failed');
      return 'failed';
    });

    return {
      cf: cfResult,
      redis: redisResult,
    };
  }
}
