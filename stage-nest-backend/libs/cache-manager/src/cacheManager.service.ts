import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { InjectRedis } from '@nestjs-modules/ioredis';

import Redis from 'ioredis';

import { json } from 'typia';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class CacheManagerService implements OnModuleDestroy, OnModuleInit {
  private defaultExpireTimeInSeconds;
  private logger = new Logger(CacheManagerService.name);
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.defaultExpireTimeInSeconds = Math.floor(
      APP_CONFIGS.PLATFORM.DEFAULT_CACHE_TTL_SECONDS,
    );
  }

  async del(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async deleteByPattern(pattern: string) {
    const scanStream = this.redis.scanStream({
      count: APP_CONFIGS.REDIS.SCAN_N_DELETE_BATCH_SIZE,
      match: pattern,
    });
    this.logger.debug(`Clearing redis keys with ${pattern} pattern`);

    const deletionPromises = [];
    for await (const keys of scanStream) {
      const filteredKeys = keys as string[];
      const redisPipeline = this.redis.pipeline();
      filteredKeys.forEach((key) => redisPipeline.unlink(key));
      deletionPromises.push(redisPipeline.exec());
    }
    return Promise.all(
      deletionPromises.map((dp) =>
        dp.catch((e) =>
          this.logger.error({ error: e }, 'Failed to delete redis key'),
        ),
      ),
    );
  }
  async get<T extends object>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value.toString());
  }
  async onModuleDestroy() {
    return this.redis.disconnect();
  }
  async onModuleInit() {
    return this.logger.debug(
      { pingStatus: await this.redis.ping() },
      'Redis Ping Check',
    );
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultExpireTimeInSeconds,
  ): Promise<'OK'> {
    const serializedValue = json.stringify(value as unknown); // The value is casted to unknown as typia.stringify() does not accept generic types. This is not a problem.
    return this.redis.set(key, serializedValue, 'EX', ttl);
  }
}
