import { Module } from '@nestjs/common';

import { RedisModule } from '@nestjs-modules/ioredis';

import { CacheManagerService } from './cacheManager.service';
import { RedisUtility } from './redis.utility';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerModule } from '@app/error-handler';

@Module({
  exports: [CacheManagerService, RedisUtility],
  imports: [
    ErrorHandlerModule,
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: `redis://${APP_CONFIGS.REDIS.HOST}:${APP_CONFIGS.REDIS.PORT}`,
      }),
    }),
  ],
  providers: [CacheManagerService, RedisUtility],
})
export class CacheManagerModule {}
