import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import { privilegesEnum } from '../adminUser/enums/privileges.enum';
import { AppSettingService } from './appSetting.service';
import { PGConfigResponseDTO } from './dtos/pGConfig.response.dto';
import { type UpdatePGConfigRequestDTO } from './dtos/updatePGConfig.request.dto';
import { UpdatePGConfigResponseDTO } from './dtos/updatePGConfig.response.dto';
import { Admin, AdminUserGuard } from '@app/auth';

@UseGuards(AdminUserGuard)
@Controller('config')
export class AppSettingController {
  constructor(private readonly appSettingService: AppSettingService) {}

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PG_ALL,
    privilegesEnum.PG_READ,
  )
  @TypedRoute.Get()
  async getPGConfig(): Promise<PGConfigResponseDTO> {
    return this.appSettingService.getPGConfig();
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PG_ALL,
    privilegesEnum.PG_UPDATE,
  )
  @TypedRoute.Patch()
  async updatePGConfig(
    @TypedBody() updatePGConfigRequestDTO: UpdatePGConfigRequestDTO,
  ): Promise<UpdatePGConfigResponseDTO> {
    return this.appSettingService.updatePGConfig(updatePGConfigRequestDTO);
  }
}
