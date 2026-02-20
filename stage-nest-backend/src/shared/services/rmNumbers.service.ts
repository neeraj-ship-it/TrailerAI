import { Injectable } from '@nestjs/common';

import { CacheManagerService } from '@app/cache-manager';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

const RM_NUMBERS_CACHE_KEY = 'rm_numbers';

@Injectable()
export class RmNumbersService {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly cacheManager: CacheManagerService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private getUserIdHash(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  async getRmNumberForUser(userId: string): Promise<string> {
    const rmNumbers = await this.getRmNumbers();
    if (rmNumbers.length === 0) {
      return '';
    }
    const index = this.getUserIdHash(userId) % rmNumbers.length;
    return rmNumbers[index];
  }

  async getRmNumbers(): Promise<string[]> {
    const cached = await this.cacheManager.get<string[]>(RM_NUMBERS_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const setting = await this.errorHandler.raiseErrorIfNullAsync(
      this.settingRepository.findById(APP_CONFIGS.SETTING.ENTITY_ID),
      Errors.SETTING.NOT_FOUND(),
    );

    const rmNumbers =
      setting.commonForDialects?.commonForLangs?.rm_numbers ?? [];

    await this.cacheManager.set(
      RM_NUMBERS_CACHE_KEY,
      rmNumbers,
      APP_CONFIGS.CACHE.TTL.ONE_DAY,
    );

    return rmNumbers;
  }

  async updateRmNumbers(numbers: string[]): Promise<string[]> {
    await this.errorHandler.raiseErrorIfNullAsync(
      this.settingRepository.findByIdAndUpdate(
        APP_CONFIGS.SETTING.ENTITY_ID,
        {
          $set: {
            'commonForDialects.commonForLangs.rm_numbers': numbers,
          },
        },
        { new: true, runValidators: true },
      ),
      Errors.SETTING.UPDATE_FAILED(),
    );

    await this.cacheManager.del(RM_NUMBERS_CACHE_KEY);

    await this.cacheManager.set(
      RM_NUMBERS_CACHE_KEY,
      numbers,
      APP_CONFIGS.CACHE.TTL.ONE_DAY,
    );

    return numbers;
  }
}
