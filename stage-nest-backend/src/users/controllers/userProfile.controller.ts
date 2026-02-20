import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Param, Req } from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

import type {
  CreateUserProfileRequestDto,
  SwitchProfileResponseDto,
  UpdateUserProfileRequestDto,
  UserProfileDto,
} from '../dtos/userProfile.dto';
import { UserProfileService } from '../services/userProfile.service';
import { type Context, type ContextUser, Ctx, CtxUser } from '@app/auth';

@Controller('profiles')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @TypedRoute.Post()
  async createProfile(
    @TypedBody() body: CreateUserProfileRequestDto,
    @CtxUser() ctx: ContextUser,
  ): Promise<UserProfileDto> {
    return this.userProfileService.createProfile(body, ctx.id.toString());
  }

  @TypedRoute.Delete(':id')
  async deleteProfile(
    @Param('id') profileId: string,
    @CtxUser() ctx: ContextUser,
  ): Promise<void> {
    return this.userProfileService.delete(profileId, ctx.id);
  }

  @TypedRoute.Get()
  async getAllProfiles(@Ctx() ctx: Context): Promise<UserProfileDto[]> {
    const profileId = ctx.user?.profileId || ctx.user.id;
    return this.userProfileService.getProfiles(
      ctx.user.id,
      profileId,
      ctx.meta.dialect,
    );
  }

  @TypedRoute.Get(':id')
  async getProfileById(
    @Param('id') profileId: string,
    @CtxUser() ctx: ContextUser,
  ): Promise<UserProfileDto> {
    return this.userProfileService.getProfileById(profileId, ctx.id);
  }

  @TypedRoute.Post('/switch/:id')
  async switchProfile(
    @Param('id') profileId: string,
    @Ctx() ctx: Context,
    @Req() req: FastifyRequest,
  ): Promise<SwitchProfileResponseDto> {
    return this.userProfileService.switchProfile(profileId, ctx.user.id, req);
  }

  @TypedRoute.Patch(':id')
  async updateProfile(
    @Param('id') profileId: string,
    @TypedBody() body: UpdateUserProfileRequestDto,
    @CtxUser() ctx: ContextUser,
  ): Promise<UserProfileDto> {
    return this.userProfileService.updateProfile(profileId, body, ctx.id);
  }
}
