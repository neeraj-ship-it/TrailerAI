import { Injectable, Logger } from '@nestjs/common';

import { InjectRedis } from '@nestjs-modules/ioredis';

import Redis from 'ioredis';

import { randomUUID } from 'crypto';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { delay } from '@app/common/utils/helpers';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class RedisUtility {
  private logger = new Logger(RedisUtility.name);
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private async acquireLock(
    key: string,
    value: string,
    ttl = APP_CONFIGS.CACHE.TTL.DISTRIBUTED_LOCK,
  ) {
    const lockKey = key + '_LOCK';

    const result = await this.redis.set(
      lockKey,
      value,
      'EX',
      ttl, // Set expiration time in secs
      'NX', // Only set if the key does not exist
    );
    const locked = result === 'OK';
    if (locked) {
      this.logger.debug(`LOCK ACQUIRED FOR:${key}`);
      return 'success';
    }
    this.logger.debug(`UNABLE TO ACQUIRE LOCK FOR:${key}`);
    return 'fail';
  }

  private async releaseLock(key: string, value: string): Promise<boolean> {
    const lockKey = key + '_LOCK';

    // only the owner of the lock can unlock it
    const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

    // Use ioredis's eval method to run lua script
    const result = await this.redis.eval(luaScript, 1, lockKey, value);
    const unlocked = result === 1;

    this.logger.debug(
      `LOCK ${unlocked ? 'RELEASED' : 'FAILED TO RELEASE'} FOR:${key}`,
    );

    return unlocked;
  }

  async executeWithLock<T>(
    key: string,
    fn: (() => T) | (() => Promise<T>),
    retryCount = 0,
  ): Promise<T> {
    if (retryCount > 3) throw new Error(`Lock retry limit reached for ${key}`); // base condition to stop infinite recursion

    const lockValue = randomUUID();
    const lockResponse = await this.acquireLock(key, lockValue);

    if (lockResponse === 'fail') {
      const delayConst = Math.random() * 5000;
      await delay(delayConst);
      return this.executeWithLock(key, fn, retryCount + 1);
    }

    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(async (value) => {
          await this.releaseLock(key, lockValue);
          return value;
        })
        .catch(async (error) => {
          await this.releaseLock(key, lockValue);
          this.logger.error({ error }, `Failed to execute with lock:${key}`);
          throw new Error(`Failed to execute with lock:${key}`);
        });
    }

    await this.releaseLock(key, lockValue);
    return result;
  }
}
