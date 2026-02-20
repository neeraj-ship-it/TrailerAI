import { Module } from '@nestjs/common';

import { RepositoryCacheService } from './repositoryCache.service';
import { CacheManagerModule } from 'libs/cache-manager/src';
@Module({
  exports: [RepositoryCacheService],
  imports: [CacheManagerModule],
  providers: [RepositoryCacheService],
})
export class RepositoryCacheModule {}
