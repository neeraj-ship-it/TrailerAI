import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  type GetAllReelsQuery,
  ReelsResponse,
  type RegisterActionReelsRequestDto,
  RegisterActionReelsResponseDto,
  type WatchProgressReelsRequestDto,
  type WatchProgressReelsResponseDto,
  ReelResponseDto,
  type GetReelByIdQuery,
} from '../dto/reels.dto';
import { ReelsService } from '../services/reels.service';
import { type Context, Ctx } from '@app/auth';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @TypedRoute.Get('id')
  async getReelById(
    @TypedQuery() query: GetReelByIdQuery,
    @Ctx() ctx: Context,
  ): Promise<ReelResponseDto | null> {
    return this.reelsService.getReelById(
      query.reelId,
      ctx.meta.dialect,
      ctx.meta.lang,
      ctx.user.id,
    );
  }

  @TypedRoute.Get('all')
  async getReels(
    @TypedQuery() query: GetAllReelsQuery,
    @Ctx() ctx: Context,
  ): Promise<ReelsResponse> {
    const { lastReelId } = query;
    return this.reelsService.getReels({
      dialect: ctx.meta.dialect,
      lang: ctx.meta.lang,
      lastReelId,
      userId: ctx.user.id,
    });
  }

  @TypedRoute.Patch('action')
  async registerActionReels(
    @TypedBody() registerActionReelsRequestDto: RegisterActionReelsRequestDto,
    @Ctx() ctx: Context,
  ): Promise<RegisterActionReelsResponseDto> {
    return this.reelsService.registerActionReels({
      dialect: ctx.meta.dialect,
      registerActionReelsRequestDto,
      userId: ctx.user.id,
    });
  }

  @TypedRoute.Patch('watch-progress')
  async watchProgress(
    @TypedBody() watchProgressReelsRequestDto: WatchProgressReelsRequestDto,
    @Ctx() ctx: Context,
  ): Promise<WatchProgressReelsResponseDto> {
    return this.reelsService.watchProgressReels({
      dialect: ctx.meta.dialect,
      meta: ctx.meta,
      userId: ctx.user.id,
      watchProgressReelsRequestDto,
    });
  }
}
