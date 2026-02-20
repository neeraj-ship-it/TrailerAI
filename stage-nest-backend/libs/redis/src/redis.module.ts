import { Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import { ComplexRedisService } from './stores/complex-redis.service';
import { ContentSensorRedisStore } from './stores/preview-content.redisStore';

@Module({
  exports: [RedisService, ComplexRedisService, ContentSensorRedisStore],
  providers: [RedisService, ComplexRedisService, ContentSensorRedisStore],
})
export class RedisModule {}
