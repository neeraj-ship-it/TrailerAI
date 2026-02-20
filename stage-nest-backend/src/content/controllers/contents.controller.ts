import { TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  ProfileSelectionContentDataResponseDto,
  type AllContentResponseDTO,
} from '../dto/allContent.response.dto';
import { ContentAssetsResponseDto } from '../dto/contentAsset.response.dto';
import { type ContentAssetsRequestDto } from '../dto/contentAssets.request.dto';
import { type GroupByGenreRequestDto } from '../dto/getGenreWiseData.request.dto';
import { type GroupByGenreResponseDto } from '../dto/getGenreWiseData.response.dto';
import {
  MicroDramaResponseDto,
  type MicroDramaRequestQuery,
} from '../dto/microDrama.response.dto';
import { type PromotionClipRequestDto } from '../dto/promotionClip.request.dto';
import { PromotionClipResponseDto } from '../dto/promotionClip.response.dto';
import { type SlugByContentIdRequestDto } from '../dto/slugByContent.dto';
import { ComingSoonResponseDto } from '../dto/upcomingContent.response.dto';
import { ContentService } from '../services/content.services';
import {
  type Context,
  type ContextUser,
  Ctx,
  CtxUser,
  PlatformPublic,
} from '@app/auth';
import { IHomePageRowResponse } from 'common/interfaces/homepage.interface';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @TypedRoute.Get('allContents')
  @PlatformPublic()
  async allContent(@Ctx() ctx: Context): Promise<AllContentResponseDTO> {
    return this.contentService.allContent(ctx);
  }

  @TypedRoute.Get('content-assets')
  async contentAssets(
    @TypedQuery() query: ContentAssetsRequestDto,
    @Ctx() ctx: Context,
  ): Promise<ContentAssetsResponseDto> {
    const { assetType, contentId, contentType } = query;
    return this.contentService.contentAssets(
      contentId,
      contentType,
      assetType,
      ctx.meta.dialect,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Get('microDramas')
  async getMicroDramas(
    @Ctx() ctx: Context,
    @TypedQuery() query: MicroDramaRequestQuery,
  ): Promise<MicroDramaResponseDto> {
    return this.contentService.getMicroDramas({
      dialect: ctx.meta.dialect,
      lang: ctx.meta.lang,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      watchFilter: query.watchFilter,
    });
  }

  @TypedRoute.Get('upcoming')
  async getUpcomingContent(
    @Ctx() ctx: Context,
  ): Promise<ComingSoonResponseDto> {
    return this.contentService.getUpcomingSectionDetails(ctx);
  }

  @PlatformPublic()
  @TypedRoute.Get('groupByGenre')
  async groupByGenre(
    @TypedQuery() query: GroupByGenreRequestDto,
    @Ctx() ctx: Context,
  ): Promise<GroupByGenreResponseDto> {
    const { dialect, lang } = ctx.meta;
    const { format, genreId, type } = query;

    return this.contentService.groupByGenre({
      dialect,
      format,
      genreId,
      lang,
      type,
    });
  }

  @TypedRoute.Get('preview-content-row')
  async previewContentRow(
    @CtxUser() ctxUser: ContextUser,
    @Ctx() ctx: Context,
  ): Promise<IHomePageRowResponse> {
    return this.contentService.getPreviewContentRow(
      ctxUser.id,
      ctx.meta.dialect,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Get('profile-selection-contents')
  async profileSelectionContents(
    @Ctx() ctx: Context,
  ): Promise<ProfileSelectionContentDataResponseDto> {
    return this.contentService.profileSelectionContentData(ctx.meta.lang);
  }

  @TypedRoute.Get('promotionClip')
  async promotionClip(
    @TypedQuery() query: PromotionClipRequestDto,
    @Ctx() ctx: Context,
  ): Promise<PromotionClipResponseDto> {
    const { contentId, contentType } = query;
    const { dialect, lang, platform } = ctx.meta;

    return this.contentService.promotionClip({
      contentId,
      contentType,
      dialect,
      lang,
      platform,
    });
  }

  // TODO: deprecate after full adoption in ads for this usecase
  @TypedRoute.Get('slugByContentId')
  async slugByContentId(@TypedQuery() query: SlugByContentIdRequestDto) {
    return this.contentService.slugByContentId(query);
  }
}
