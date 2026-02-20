import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Query } from '@nestjs/common';

import {
  type CreateUserAccountInviteRequestDto,
  type UpdateUserAccountInviteRequestDto,
  UserAccountInviteResponseDto,
  UserAccountInviteResponseDtoList,
} from '../dtos/userAccountInvite.dto';
import { UserAccountInviteService } from '../services/userAccountInvite.service';
import { type Context, type ContextUser, Ctx, CtxUser } from '@app/auth';
import { Public } from '@app/auth';

@Controller('account-invites')
export class UserAccountInviteController {
  constructor(
    private readonly userAccountInviteService: UserAccountInviteService,
  ) {}

  @TypedRoute.Post()
  async createUserAccountInvite(
    @TypedBody() body: CreateUserAccountInviteRequestDto,
    @Ctx() ctx: Context,
  ): Promise<UserAccountInviteResponseDto> {
    return this.userAccountInviteService.createUserAccountInvite(ctx, body);
  }

  @TypedRoute.Get()
  async getUserAccountInvites(
    @CtxUser() user: ContextUser,
  ): Promise<UserAccountInviteResponseDtoList> {
    return this.userAccountInviteService.getUserAccountInvitesByUserId(user.id);
  }

  @Public()
  @TypedRoute.Patch()
  async updateUserAccountInvite(
    @Query('linkId') linkId: string,
    @TypedBody() body: UpdateUserAccountInviteRequestDto,
    @CtxUser() user: ContextUser,
  ): Promise<UserAccountInviteResponseDto> {
    return this.userAccountInviteService.updateUserAccountInvite(
      linkId,
      user?.id ?? body.userId,
      body,
    );
  }
}
