import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminUserModule } from '../adminUser/adminUser.module';
import { AdminAuthService } from '../adminUser/services/adminAuth.service';
import { DeeplinkController } from './controllers/deeplink.controller';
import { DeeplinkService } from './services/deeplink.service';
import { ContentRepository } from '@app/cms/repositories/content.repository';
import { Contents } from '@app/common/entities/contents.entity';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';
import { Episode } from 'src/content/entities/episodes.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';

@Module({
  controllers: [DeeplinkController],
  exports: [DeeplinkService],
  imports: [
    AdminUserModule,
    RepositoryCacheModule,
    MikroOrmModule.forFeature([Contents]),
    MongooseModule.forFeature([createModelDefinition(Episode)]),
  ],
  providers: [
    DeeplinkService,
    AdminAuthService,
    ErrorHandlerService,
    ContentRepository,
    EpisodesRepository,
  ],
})
export class ContentModule {}
