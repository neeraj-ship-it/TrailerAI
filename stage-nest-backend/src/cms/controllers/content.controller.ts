import { Controller, Param, UseGuards } from '@nestjs/common';

import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';

import {
  type AddOrUpdateContentToComingSoon,
  type CombinedShowSeasonEpisodeResponseDTO,
  type CreateOrUpdateMovieDTO,
  type CreateShowDTO,
  CtrThumbnailsResponseDTO,
  type MovieResponseDTO,
  type PaginatedResponse,
  type UpcomingContentDetailsResponse,
  type UpdateShowDTO,
} from '../dtos/content.dto';
import { type AllContentRequestQuery } from '../interfaces/content.interface';
import { ComingSoonService } from '../services/coming-soon.service';
import { ContentService } from '../services/content.service';
import { CMSAuthGuard, type Context, Ctx, Public } from '@app/auth';
import { ContentFormat, ContentStatus } from 'common/entities/contents.entity';
import { ContentTypeV2 } from 'common/enums/common.enums';
@Controller('content')
@UseGuards(CMSAuthGuard)
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly comingSoonService: ComingSoonService,
  ) {}

  @TypedRoute.Post('coming-soon/add-update')
  async addUpdateComingSoon(
    @TypedBody() body: AddOrUpdateContentToComingSoon,
  ): Promise<UpcomingContentDetailsResponse> {
    return this.comingSoonService.addOrUpdateContentToComingSoon(body);
  }

  @TypedRoute.Post('create/movie')
  async createMovie(
    @TypedBody() body: CreateOrUpdateMovieDTO,
    @Ctx() ctx: Context,
  ): Promise<MovieResponseDTO> {
    return this.contentService.createMovie(body, ctx);
  }

  @TypedRoute.Post('create/show')
  async createShow(
    @TypedBody() body: CreateShowDTO,
    @Ctx() ctx: Context,
  ): Promise<CombinedShowSeasonEpisodeResponseDTO> {
    return this.contentService.createShow(body, ctx);
  }

  @TypedRoute.Get('all')
  @Public()
  async getAllContent(
    @TypedQuery() query: AllContentRequestQuery,
  ): Promise<PaginatedResponse> {
    const { page = 1, perPage = 10 } = query;
    const offset = (page - 1) * perPage;

    return this.contentService.getAllContentList({
      ...query,
      limit: perPage,
      offset,
    });
  }

  @TypedRoute.Get('coming-soon/details/:slug')
  async getComingSoonDetails(
    @Param('slug') slug: string,
  ): Promise<UpcomingContentDetailsResponse> {
    return this.comingSoonService.getComingSoonDetails(slug);
  }

  @TypedRoute.Get('invalid')
  async getInvalidContentList(): Promise<PaginatedResponse> {
    return this.contentService.getInvalidContentList();
  }

  @TypedRoute.Get('get/movie-detail')
  async getMovieDetail(
    @TypedQuery() query: { slug: string },
    @Ctx() ctx: Context,
  ): Promise<MovieResponseDTO> {
    return await this.contentService.getMovieDetail(
      {
        slug: query.slug,
      },
      ctx,
    );
  }

  @TypedRoute.Get('get/show-detail')
  async getShowDetail(
    @TypedQuery() query: { slug: string },
    @Ctx() ctx: Context,
  ): Promise<CombinedShowSeasonEpisodeResponseDTO> {
    return await this.contentService.getShowDetail({ slug: query.slug }, ctx);
  }

  @TypedRoute.Get('thumbnail-ctr/:slug/:contentType')
  async getThumbnailCtr(
    @Param('slug') slug: string,
    @Param('contentType') contentType: ContentTypeV2,
    @Ctx() ctx: Context,
  ): Promise<CtrThumbnailsResponseDTO> {
    return await this.contentService.getThumbnailCtr(slug, contentType, ctx);
  }

  @TypedRoute.Post('publish')
  async publishContent(
    @TypedBody()
    body: {
      slug: string;
      status: ContentStatus.ACTIVE | ContentStatus.PREVIEW_PUBLISHED;
      resentUserContentMetadata?: boolean;
    },
    @Ctx() ctx: Context,
  ): Promise<unknown> {
    return await this.contentService.publishContent({
      ...body,
      ctx,
    });
  }
  @Public()
  @TypedRoute.Post('publish-scheduled-episodes')
  async publishFailedScheduledEpisodes(): Promise<void> {
    return await this.contentService.publishPendingEpisodes();
  }
  @Public()
  @TypedRoute.Patch('remove-show-label-text')
  async removeShowLabelText(): Promise<void> {
    return await this.contentService.cleanupExpiredShowLabels();
  }

  @TypedRoute.Post('schedule/episode')
  async scheduleEpisode(
    @TypedBody()
    body: {
      slug: string;
      scheduledDate: string;
      contentType: ContentTypeV2;
      format: ContentFormat;
    },
    @Ctx() ctx: Context,
  ): Promise<void> {
    return await this.contentService.scheduleEpisodeForRelease({
      contentType: body.contentType,
      dialect: ctx.meta.dialect,
      format: body.format,
      scheduledDate: new Date(body.scheduledDate),
      slug: body.slug,
    });
  }

  @TypedRoute.Get('search')
  @Public()
  async searchContent(
    @TypedQuery() query: AllContentRequestQuery & { keyword: string },
  ): Promise<PaginatedResponse> {
    const {
      contentType,
      dialect,
      keyword,
      language,
      page = 1,
      perPage = 10,
      sortBy,
      sortOrder,
      status,
    } = query;
    const offset = (page - 1) * perPage;

    return await this.contentService.getAllContentList({
      contentType,
      dialect,
      keyword,
      language,
      limit: perPage,
      offset,
      sortBy,
      sortOrder,
      status,
    });
  }

  @TypedRoute.Delete('coming-soon/toggle-status')
  async toggleComingSoonStatus(
    @TypedBody() body: { slug: string },
  ): Promise<UpcomingContentDetailsResponse> {
    return this.comingSoonService.toggleComingSoonStatus(body);
  }

  @TypedRoute.Delete('/show')
  async unpublishContent(
    @TypedBody() body: { slug: string },
    @Ctx() ctx: Context,
  ): Promise<{ message: string }> {
    await this.contentService.unpublishContent(body.slug, ctx);
    return { message: 'content unpublished successfully.' };
  }

  @TypedRoute.Delete('schedule/episode')
  async unscheduleEpisode(
    @TypedBody()
    body: {
      slug: string;
      contentType: ContentTypeV2;
      format: ContentFormat;
    },
    @Ctx() ctx: Context,
  ): Promise<void> {
    return await this.contentService.removeEpisodeFromScheduledRelease({
      contentType: body.contentType,
      dialect: ctx.meta.dialect,
      format: body.format,
      slug: body.slug,
    });
  }

  @TypedRoute.Post('update/movie')
  async updateMovie(
    @TypedBody() body: CreateOrUpdateMovieDTO,
    @Ctx() ctx: Context,
  ): Promise<MovieResponseDTO> {
    return await this.contentService.updateMovie(body, ctx);
  }

  @TypedRoute.Post('update/show')
  async updateShow(
    @TypedBody() body: UpdateShowDTO,
    @Ctx() ctx: Context,
  ): Promise<CombinedShowSeasonEpisodeResponseDTO> {
    return await this.contentService.updateShow(body, ctx);
  }
}
