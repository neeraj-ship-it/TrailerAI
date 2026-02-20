import { TypedRoute, TypedQuery } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import { privilegesEnum } from '../../adminUser/enums/privileges.enum';

import {
  type GetDeeplinksRequestDto,
  type GetDeeplinksResponseDto,
} from '../dtos/deeplink.dto';
import { DeeplinkService } from '../services/deeplink.service';
import { Admin, AdminUserGuard } from '@app/auth';

@UseGuards(AdminUserGuard)
@Controller()
export class DeeplinkController {
  constructor(private readonly deeplinkService: DeeplinkService) {}

  @TypedRoute.Get('deeplink')
  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.DEEPLINK_READ,
    privilegesEnum.DEEPLINK_WRITE,
    privilegesEnum.DEEPLINK_ALL,
  )
  async getAllDeeplinks(
    @TypedQuery() query: GetDeeplinksRequestDto,
  ): Promise<GetDeeplinksResponseDto> {
    return this.deeplinkService.getAllDeelinks(query);
  }
}
