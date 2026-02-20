import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { TerminusModule } from '@nestjs/terminus';

import { MongooseModule } from '@nestjs/mongoose';

import { RouterModule } from '@nestjs/core';

import { UserCultures } from '../../common/entities/userCultures.entity';
import { UserCulturesRepository } from '../../common/repositories/userCulture.repository';
import { ConfigController } from './controllers/config.controller';
import { DecryptController } from './controllers/decrypt.controller';
import { PlatformController } from './controllers/platform.controller';
import { MetaDecryptedData } from './entities/metaDecryptedData.entity';
import { DecryptDataRepository } from './repositories/decryptData.repository';
import { CloudfrontService } from './services/cloudfront.service';
import { DecryptService } from './services/decrypt.service';
import { PhonePeHealthIndicator } from './services/phonePe.service';
import { PlatformService } from './services/platform.service';
import { UserConfigService } from './services/userConfig.service';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheService } from '@app/repository-cache';
import { CacheManagerModule } from 'libs/cache-manager/src';
@Module({
  controllers: [PlatformController, ConfigController, DecryptController],
  imports: [
    RouterModule.register([
      {
        module: PlatformModule,
        path: 'platform',
      },
    ]),
    CacheManagerModule,
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 5000,
      logger: false,
    }),
    HttpModule,
    MongooseModule.forFeature([
      createModelDefinition(UserCultures),
      createModelDefinition(MetaDecryptedData),
    ]),
  ],
  providers: [
    PhonePeHealthIndicator,
    ErrorHandlerService,
    PlatformService,
    CloudfrontService,
    UserConfigService,
    UserCulturesRepository,
    RepositoryCacheService,
    DecryptService,
    DecryptDataRepository,
  ],
})
export class PlatformModule {}
