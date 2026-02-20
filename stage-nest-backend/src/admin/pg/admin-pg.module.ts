import { Module } from '@nestjs/common';

import { AdminAuthService } from '../adminUser/services/adminAuth.service';
import { AdminPgService } from './admin-pg.service';
import { AdminMandateController } from './mandate.controller';
import { ErrorHandlerModule, ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';
import { SharedModule } from '@app/shared/shared.module';

@Module({
  controllers: [AdminMandateController],
  imports: [ErrorHandlerModule, SharedModule, RepositoryCacheModule],
  providers: [ErrorHandlerService, AdminAuthService, AdminPgService],
})
export class AdminPgModule {}
