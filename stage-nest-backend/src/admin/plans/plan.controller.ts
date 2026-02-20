import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { privilegesEnum } from '../adminUser/enums/privileges.enum';
import {
  type MigratePlanRequestDto,
  type MigratePlanResponseDto,
} from '../pg/dtos/plans.dto';
import { PlanService } from './plan.service';
import { Admin, AdminUserGuard, Public } from '@app/auth';

@UseGuards(AdminUserGuard)
@Controller()
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Admin(privilegesEnum.FULL_ACCESS)
  @Public()
  @TypedRoute.Post('/migrate')
  async migratePlan(
    @TypedBody() body: MigratePlanRequestDto,
  ): Promise<MigratePlanResponseDto> {
    await this.planService.migratePlanFromV1ToV2(body.planId);
    return { success: true };
  }
}
