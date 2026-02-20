import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminAuthService } from '../adminUser/services/adminAuth.service';

import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { Plan } from '@app/common/entities/plan.entity';
import { PlanRepository } from '@app/common/repositories/plan.repository';
import { PlanV2Repository } from '@app/common/repositories/planV2.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule, ErrorHandlerService } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

@Module({
  controllers: [PlanController],
  imports: [
    ErrorHandlerModule,
    MongooseModule.forFeature([createModelDefinition(Plan)]),
    RepositoryCacheModule,
  ],
  providers: [
    ErrorHandlerService,
    AdminAuthService,
    PlanService,
    PlanRepository,
    PlanV2Repository,
  ],
})
export class PlanModule {}
