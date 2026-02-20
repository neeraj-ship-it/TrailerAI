import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Param, UseGuards } from '@nestjs/common';

import { privilegesEnum } from '../adminUser/enums/privileges.enum';
import { AdminPgService } from './admin-pg.service';
import {
  MandateResponseDto,
  type RevokeMandateRequestDto,
} from './dtos/revoke-mandate.request.dto';
import { Admin, AdminUserGuard } from '@app/auth';

@UseGuards(AdminUserGuard)
@Controller('mandate')
export class AdminMandateController {
  constructor(private readonly adminPgService: AdminPgService) {}

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.MANDATE_READ,
    privilegesEnum.MANDATE_ALL,
  )
  @TypedRoute.Get('active/:phoneNumber')
  async fetchActiveMandate(
    @Param('phoneNumber') phoneNumber: string,
  ): Promise<MandateResponseDto[]> {
    return this.adminPgService.fetchUserActiveMandates(phoneNumber);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.MANDATE_WRITE,
    privilegesEnum.MANDATE_ALL,
  )
  @TypedRoute.Post('revoke')
  async revokeMandate(
    @TypedBody() payload: RevokeMandateRequestDto,
  ): Promise<boolean> {
    return this.adminPgService.revokeMandate(payload);
  }
}
