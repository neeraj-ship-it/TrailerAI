import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminAuthService } from '../adminUser/services/adminAuth.service';
import { AppSettingController } from './appSetting.controller';
import { AppSettingService } from './appSetting.service';
import { AppSettingHelperService } from './appSettingHelper.service';
import { Setting } from '@app/common/entities/setting.entity';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule, ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

@Module({
  controllers: [AppSettingController],
  imports: [
    ErrorHandlerModule,
    MongooseModule.forFeature([createModelDefinition(Setting)]),
    RepositoryCacheModule,
  ],
  providers: [
    ErrorHandlerService,
    AppSettingService,
    AppSettingHelperService,
    SettingRepository,
    AdminAuthService,
  ],
})
export class AppSettingModule {}
