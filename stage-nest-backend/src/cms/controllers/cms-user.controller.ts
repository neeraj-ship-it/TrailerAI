import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import { Public } from '@app/auth/decorators/public.decorator';

import {
  CMSUserDetailsDto,
  CMSUserLoginResponseDto,
  type CMSUserRegisterDto,
} from '../dtos/cms-user.dto';
import { CMSUserService } from '../services/cms-user.service';
import {
  type ContextUser,
  CtxUser,
} from '@app/auth/decorators/context.decorator';
import { CMSAuthGuard } from '@app/auth/guards/cms-auth.guard';

interface CMSUserLoginRequestDto {
  email: string;
  password: string;
}

interface UpdatePasswordRequestDto {
  email: string;
  newPassword: string;
}

@Controller('cms-user')
@UseGuards(CMSAuthGuard)
export class CMSUserController {
  constructor(private readonly cmsUserService: CMSUserService) {}

  @TypedRoute.Get('details')
  async getUserDetails(
    @CtxUser() ctx: ContextUser,
  ): Promise<CMSUserDetailsDto> {
    console.log('ctx', ctx);
    return this.cmsUserService.getUserDetails(ctx.id);
  }

  @TypedRoute.Post('login')
  @Public()
  async login(
    @TypedBody() payload: CMSUserLoginRequestDto,
  ): Promise<CMSUserLoginResponseDto> {
    return this.cmsUserService.login(payload.email, payload.password);
  }

  @Public()
  @TypedRoute.Post('register')
  async register(@TypedBody() payload: CMSUserRegisterDto): Promise<void> {
    return this.cmsUserService.register(payload);
  }

  @Public()
  @TypedRoute.Post('update-password')
  async updatePassword(
    @TypedBody() body: UpdatePasswordRequestDto,
  ): Promise<void> {
    return this.cmsUserService.updatePassword(body.email, body.newPassword);
  }
}
