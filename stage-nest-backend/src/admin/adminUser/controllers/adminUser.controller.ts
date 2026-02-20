import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import { type CreateAdminUserRequestDto } from '../dtos/createAdminUser.request.dto';
import { AdminUserResponseDTO } from '../dtos/createAdminUser.response.dto';
import { type LoginRequestDto } from '../dtos/login.request.dto';
import { type LoginResponseDTO } from '../dtos/login.response.dto';
import { type VerifyTokenResponseDTO } from '../dtos/verifyToken.response.dto';
import { privilegesEnum } from '../enums/privileges.enum';
import { AdminUserService } from '../services/adminUser.service';
import { Admin, AdminUserGuard, CtxToken, Public, type Token } from '@app/auth';

@Controller()
@UseGuards(AdminUserGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @TypedRoute.Post('createUser')
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.USER_ALL)
  async createUser(
    @TypedBody() body: CreateAdminUserRequestDto,
  ): Promise<AdminUserResponseDTO> {
    return this.adminUserService.createUser(body);
  }

  @TypedRoute.Post('login')
  @Public()
  async login(
    @TypedBody() payload: LoginRequestDto,
  ): Promise<LoginResponseDTO> {
    return this.adminUserService.login(payload.email, payload.password);
  }

  @Admin()
  @TypedRoute.Post('verify')
  async verify(@CtxToken() token: Token): Promise<VerifyTokenResponseDTO> {
    return this.adminUserService.isValidToken(token.token);
  }
}
