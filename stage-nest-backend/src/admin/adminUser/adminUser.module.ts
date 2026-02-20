import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { AdminUserController } from './controllers/adminUser.controller';
import { AdminUser } from './entities/adminUser.entity';
import { Role } from './entities/role.entity';
import { AdminUserRepository } from './repositories/adminUser.repository';
import { RoleRepository } from './repositories/role.repository';
import { AdminAuthService } from './services/adminAuth.service';
import { AdminUserService } from './services/adminUser.service';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';
import { CacheManagerModule } from 'libs/cache-manager/src';

@Module({
  controllers: [AdminUserController],
  exports: [AdminUserRepository, AdminAuthService],
  imports: [
    CacheManagerModule,
    RepositoryCacheModule,
    MongooseModule.forFeature([
      createModelDefinition(AdminUser),
      createModelDefinition(Role),
    ]),
  ],
  providers: [
    AdminUserService,
    AdminUserRepository,
    AdminAuthService,
    RoleRepository,
    ErrorHandlerService,
  ],
})
export class AdminUserModule {}
