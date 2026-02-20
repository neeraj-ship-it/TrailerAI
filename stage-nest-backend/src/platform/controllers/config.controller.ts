import { Controller } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { type UserCulturesResponseDto } from '../dtos/config.response.dto';
import { type Context, Ctx, PlatformPublic } from '@app/auth';
import { UserConfigService } from 'src/platform/services/userConfig.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly userConfigService: UserConfigService) {}

  @TypedRoute.Get('/userCultures')
  @PlatformPublic()
  userCultures(@Ctx() ctx: Context): Promise<UserCulturesResponseDto[]> {
    return this.userConfigService.getAllUserCultures(ctx.meta.lang);
  }
}
