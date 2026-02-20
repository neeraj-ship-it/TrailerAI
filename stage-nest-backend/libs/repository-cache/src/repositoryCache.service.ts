import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';

import { createHash } from 'node:crypto';

import { json } from 'typia';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { BaseModel } from 'common/entities/base.entity';
import { CacheManagerService } from 'libs/cache-manager/src';

interface CacheQueryOptions {
  collection: string;
  key: string;
  ttl?: number;
}

@Injectable()
export class RepositoryCacheService<T extends BaseModel> {
  private defaultTTL: number;
  private logger = new Logger(RepositoryCacheService.name);

  constructor(@Inject() private cacheManager: CacheManagerService) {
    this.defaultTTL = APP_CONFIGS.PLATFORM.DEFAULT_CACHE_TTL_SECONDS;
  }

  async cacheQuery<T>(
    query: () => Promise<T>,
    { key, ttl }: CacheQueryOptions,
  ): Promise<T | null> {
    const cachedResult = await this.cacheManager.get(key);
    if (cachedResult) {
      this.logger.debug(`Cache hit for ${key}`);
      return cachedResult as T;
    }
    const result = await query();

    // To skip null caching
    if (result) {
      this.cacheManager.set(key, result, ttl ?? this.defaultTTL);
      return result;
    }

    return null;
  }

  clearCacheByCollectionName(collectionName: string) {
    return this.cacheManager.deleteByPattern(`${collectionName}*`);
  }

  getCacheKey<K extends keyof T>(
    key: Model<T>,
    query: FilterQuery<T>,
    projection?: K[],
  ) {
    const md5HashKey = createHash('md5')
      .update(
        json.stringify(query) + (projection ? `:${projection.join(':')}` : ''),
      )
      .digest('hex');
    return `${key.modelName.toLowerCase()}:${md5HashKey}`.trim();
  }
}
