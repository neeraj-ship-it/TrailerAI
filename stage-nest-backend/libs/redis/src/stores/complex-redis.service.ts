import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import Redis from 'ioredis';

import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class ComplexRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(ComplexRedisService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      commandTimeout: 2000, // 2 seconds timeout for Redis operations
      db: APP_CONFIGS.COMPLEX_REDIS.DB,
      host: APP_CONFIGS.COMPLEX_REDIS.HOST,
      port: APP_CONFIGS.COMPLEX_REDIS.PORT,
    });

    // Add comprehensive error handling for Redis connection
    this.redis.on('error', (error) => {
      this.logger.error(
        {
          error,
        },
        `${ComplexRedisService.name} error:`,
      );
    });

    this.redis.on('connect', () => {
      this.logger.log(`${ComplexRedisService.name} connected successfully`);
    });

    this.redis.on('close', () => {
      this.logger.warn(`${ComplexRedisService.name} connection closed`);
    });

    this.redis.on('reconnecting', (delay: number) => {
      this.logger.warn(
        `${ComplexRedisService.name} reconnecting in ${delay}ms`,
      );
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

  async hdel(key: string, ...fields: string[]) {
    return await this.redis.hdel(key, ...fields);
  }

  async hexists(key: string, field: string) {
    return await this.redis.hexists(key, field);
  }

  async hget(key: string, field: string) {
    return await this.redis.hget(key, field);
  }

  async hgetall(key: string) {
    return await this.redis.hgetall(key);
  }

  async hkeys(key: string) {
    return await this.redis.hkeys(key);
  }

  async hlen(key: string) {
    return await this.redis.hlen(key);
  }

  async hmget(key: string, ...fields: string[]) {
    return await this.redis.hmget(key, ...fields);
  }

  async hmset(key: string, fields: Record<string, string>) {
    return await this.redis.hmset(key, fields);
  }

  // Hashes Methods
  async hset(key: string, field: string, value: string) {
    return await this.redis.hset(key, field, value);
  }

  async hvals(key: string) {
    return await this.redis.hvals(key);
  }

  async incr(key: string) {
    return await this.redis.incr(key);
  }

  async jsonArrayPush(key: string, value: unknown) {
    const data = (await this.jsonGet<unknown[]>(key)) || [];
    data.push(value);
    return await this.jsonSet(key, data);
  }

  async jsonGet<T = unknown>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  // JSON Data Structure Methods
  async jsonSet(key: string, data: unknown) {
    return await this.redis.set(key, JSON.stringify(data));
  }

  async jsonSetWithExpiry(key: string, data: unknown, ttlSeconds: number) {
    return await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async keys(pattern: string) {
    return await this.redis.keys(pattern);
  }

  async lindex(key: string, index: number) {
    return await this.redis.lindex(key, index);
  }

  async llen(key: string) {
    return await this.redis.llen(key);
  }

  async lpop(key: string) {
    return await this.redis.lpop(key);
  }

  // Lists Methods
  async lpush(key: string, ...elements: string[]) {
    return await this.redis.lpush(key, ...elements);
  }

  async lrange(key: string, start: number, stop: number) {
    return await this.redis.lrange(key, start, stop);
  }

  async lrem(key: string, count: number, value: string) {
    return await this.redis.lrem(key, count, value);
  }

  async onModuleDestroy() {
    if (APP_CONFIGS.IS_TEST) return;
    await this.redis.quit();
  }

  async quit() {
    await this.redis.quit();
  }

  async rpop(key: string) {
    return await this.redis.rpop(key);
  }

  async rpush(key: string, ...elements: string[]) {
    return await this.redis.rpush(key, ...elements);
  }

  // Sets Methods
  async sadd(key: string, ...members: string[]) {
    if (members.length === 0) return 0;
    return await this.redis.sadd(key, ...members);
  }

  /**
   * Non-blocking scan command that returns a cursor and keys
   * @param cursor - Starting cursor (0 for first scan)
   * @param pattern - Key pattern to match
   * @param count - Approximate number of keys to return per iteration
   * @returns [nextCursor, keys[]]
   */
  async scan(
    cursor: number,
    pattern?: string,
    count?: number,
  ): Promise<[string, string[]]> {
    if (pattern && count) {
      return await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    } else if (pattern) {
      return await this.redis.scan(cursor, 'MATCH', pattern);
    } else if (count) {
      return await this.redis.scan(cursor, 'COUNT', count);
    } else {
      return await this.redis.scan(cursor);
    }
  }

  /**
   * Non-blocking method to get all keys matching a pattern
   * Uses SCAN command to avoid blocking Redis
   * @param pattern - Key pattern to match
   * @param count - Approximate number of keys to return per iteration (default: 100)
   * @returns Array of all matching keys
   */
  async scanAll(pattern: string, count = 100): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;
    let retryCount = 0;
    const maxRetries = 3;

    while (true) {
      try {
        const [nextCursor, foundKeys] = await this.scan(cursor, pattern, count);
        keys.push(...foundKeys);
        cursor = parseInt(nextCursor, 10);
        retryCount = 0; // Reset retry count on successful scan

        if (cursor === 0) break;
      } catch (error) {
        this.logger.error(`Redis scan error at cursor ${cursor}:`, error);

        if (retryCount >= maxRetries) {
          this.logger.error(
            `Max retries (${maxRetries}) exceeded for scan operation`,
          );
          throw error;
        }

        retryCount++;
        this.logger.warn(
          `Retrying scan operation (attempt ${retryCount}/${maxRetries})`,
        );

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 100),
        );
      }
    }

    return keys;
  }

  async scard(key: string) {
    return await this.redis.scard(key);
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

  async sinter(...keys: string[]) {
    return await this.redis.sinter(...keys);
  }

  async sismember(key: string, member: string) {
    return await this.redis.sismember(key, member);
  }

  async smembers(key: string) {
    return await this.redis.smembers(key);
  }

  async srem(key: string, ...members: string[]) {
    return await this.redis.srem(key, ...members);
  }

  async sunion(...keys: string[]) {
    return await this.redis.sunion(...keys);
  }

  // Sorted Sets Methods
  async zadd(key: string, score: number, member: string) {
    return await this.redis.zadd(key, score, member);
  }

  async zcard(key: string) {
    return await this.redis.zcard(key);
  }

  async zrange(key: string, start: number, stop: number, withScores = false) {
    if (withScores) {
      return await this.redis.zrange(key, start, stop, 'WITHSCORES');
    }
    return await this.redis.zrange(key, start, stop);
  }
  async zrank(key: string, member: string) {
    return await this.redis.zrank(key, member);
  }
  async zrem(key: string, ...members: string[]) {
    return await this.redis.zrem(key, ...members);
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores = false,
  ) {
    if (withScores) {
      return await this.redis.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return await this.redis.zrevrange(key, start, stop);
  }

  async zrevrank(key: string, member: string) {
    return await this.redis.zrevrank(key, member);
  }

  async zscore(key: string, member: string) {
    return await this.redis.zscore(key, member);
  }
}
