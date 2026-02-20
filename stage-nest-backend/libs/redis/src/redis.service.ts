import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import Redis from 'ioredis';

import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      commandTimeout: 100, // 100ms timeout for all Redis operations
      db: APP_CONFIGS.REDIS.DB,
      host: APP_CONFIGS.REDIS.HOST,
      port: APP_CONFIGS.REDIS.PORT,
    });

    // Add error handling for Redis connection
    this.redis.on('error', (error) => {
      this.logger.error({ error }, `${RedisService.name} error:`);
    });

    this.redis.on('connect', () => {
      this.logger.log(`${RedisService.name} connected successfully`);
    });
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async get(key: string) {
    return await this.redis.get(key);
  }

  async getMulti() {
    return this.redis.multi();
  }

  async getPipeline() {
    return this.redis.pipeline();
  }

  async incr(key: string) {
    return await this.redis.incr(key);
  }

  async onModuleDestroy() {
    if (APP_CONFIGS.IS_TEST) return;
    await this.redis.quit();
  }

  async quit() {
    await this.redis.quit();
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      return await this.redis.set(key, value, 'EX', ttl);
    }
    return await this.redis.set(key, value);
  }

  async setNumber(key: string, value: number) {
    return await this.redis.set(key, value);
  }
}
