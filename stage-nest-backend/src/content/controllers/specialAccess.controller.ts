import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { Ctx, type Context, PlatformPublic } from '@app/auth';

import type {
  CreateUserSpecialStateRequestDto,
  MicrodramaFreePreviewRequestDto,
  UpdateUserSpecialStateRequestDto,
} from '../dto/specialAccess.request.dto';
import type {
  WebOfferPageResponseDto,
  MicrodramaFreePreviewResponseDto,
  SpecialAccessResponseDto,
} from '../dto/specialAccess.response.dto';
import { SpecialAccessService } from '../services/specialAccess.service';

@Controller('special-access')
export class SpecialAccessController {
  constructor(private readonly specialAccessService: SpecialAccessService) {}

  @TypedRoute.Post('user-state')
  async createUserSpecialState(
    @Ctx() ctx: Context,
    @TypedBody() body: CreateUserSpecialStateRequestDto,
  ): Promise<SpecialAccessResponseDto> {
    return this.specialAccessService.createUserSpecialState(
      ctx.user.id,
      ctx.meta.dialect,
      body,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Get('microdrama-free-preview')
  async getMicrodramaFreePreview(
    @Ctx() ctx: Context,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    return this.specialAccessService.getMicrodramaFreePreview(
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Get('user-state')
  async getUserSpecialAccess(
    @Ctx() ctx: Context,
  ): Promise<SpecialAccessResponseDto> {
    return this.specialAccessService.getUserSpecialAccess(
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
    );
  }

  @PlatformPublic()
  @TypedRoute.Get('web-offer-page')
  async getWebOfferPage(
    @Ctx() ctx: Context,
    @TypedQuery() query: CreateUserSpecialStateRequestDto,
  ): Promise<WebOfferPageResponseDto> {
    return this.specialAccessService.getWebOfferPage(
      ctx.meta.dialect,
      ctx.meta.lang,
      query,
    );
  }

  @TypedRoute.Patch('microdrama-free-preview')
  async patchMicrodramaFreePreview(
    @Ctx() ctx: Context,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    return this.specialAccessService.patchMicrodramaFreePreview(
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Post('microdrama-free-preview')
  async postMicrodramaFreePreview(
    @Ctx() ctx: Context,
    @TypedBody() body: MicrodramaFreePreviewRequestDto,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    return this.specialAccessService.postMicrodramaFreePreview(
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
      body,
    );
  }

  @TypedRoute.Patch('user-state')
  async updateUserSpecialState(
    @Ctx() ctx: Context,
    @TypedBody() body: UpdateUserSpecialStateRequestDto,
  ): Promise<SpecialAccessResponseDto> {
    return this.specialAccessService.updateUserSpecialState(
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
      body,
    );
  }
}
