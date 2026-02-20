import { TypedBody, TypedRoute, TypedQuery } from '@nestia/core';
import { Controller, Param, UseGuards } from '@nestjs/common';

import type {
  OnboardingCategoryListDto,
  UserOnboardingCategoryActionDto,
  UserOnboardingPreferenceResponseDto,
  UserOnboardingStateResponseDto,
  RecommendedContentListDto,
  ContentFilterDto,
  UpdateContentProgressDto,
  OnboardingLandingPageDto,
  HomePageWidgetDto,
  GetContentByCategoryResponseDto,
  GetAllContentResponseDto,
  GetOnboardingCategoriesQueryDto,
} from '../dto/contentOnboarding.dto';
import { NoGujaratiDialectGuard } from '../guards/no-gujarati-dialect.guard';
import { OnboardingService } from '../services/onboarding.service';
import { type Context, Ctx } from '@app/auth';

@Controller('onboarding')
@UseGuards(NoGujaratiDialectGuard)
export class ContentOnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @TypedRoute.Get('/content/all')
  async getAllContentWithCategories(
    @Ctx() ctx: Context,
  ): Promise<GetAllContentResponseDto> {
    return this.onboardingService.getAllContentWithCategories(ctx.meta.dialect);
  }

  @TypedRoute.Get('/content/category/:categoryId')
  async getContentByCategory(
    @Param('categoryId') categoryId: string,
    @Ctx() ctx: Context,
  ): Promise<GetContentByCategoryResponseDto> {
    return this.onboardingService.getContentByCategory(
      categoryId,
      ctx.meta.dialect,
    );
  }

  @TypedRoute.Get('/content/:contentSlug')
  async getContentBySlug(@Param('contentSlug') contentSlug: string) {
    return this.onboardingService.getContentBySlug(contentSlug);
  }

  @TypedRoute.Get('/home-widget')
  async getHomePageWidget(@Ctx() ctx: Context): Promise<HomePageWidgetDto> {
    return this.onboardingService.getHomePageWidget(ctx.user.id);
  }

  @TypedRoute.Get('categories')
  async getOnboardingCategories(
    @Ctx() ctx: Context,
    @TypedQuery() query: GetOnboardingCategoriesQueryDto,
  ): Promise<OnboardingCategoryListDto> {
    return this.onboardingService.getOnboardingCategories({
      dialect: ctx.meta.dialect,
      feature: query.feature,
      lang: ctx.meta.lang,
      userId: ctx.user.id,
    });
  }

  @TypedRoute.Get('landing-page')
  async getOnboardingLandingPage(
    @Ctx() ctx: Context,
  ): Promise<OnboardingLandingPageDto> {
    return this.onboardingService.getOnboardingLandingPage(
      ctx.user.id,
      ctx.meta.lang,
      ctx.meta.dialect,
    );
  }

  @TypedRoute.Get('recommendations')
  async getRecommendedContent(
    @TypedQuery() filters: ContentFilterDto = { limit: 6 },
    @Ctx() ctx: Context,
  ): Promise<RecommendedContentListDto> {
    return this.onboardingService.getRecommendedContent({
      dialect: ctx.meta.dialect,
      filters,
      lang: ctx.meta.lang,
      userId: ctx.user.id,
    });
  }

  @TypedRoute.Get('state')
  async getUserOnboardingState(
    @Ctx() ctx: Context,
    @TypedQuery() query: GetOnboardingCategoriesQueryDto,
  ): Promise<UserOnboardingStateResponseDto> {
    return this.onboardingService.getUserOnboardingState(
      ctx.user.id,
      ctx.meta.lang,
      query.feature,
    );
  }

  @TypedRoute.Post('progress')
  async updateContentProgress(
    @TypedBody() progressData: UpdateContentProgressDto,
    @Ctx() ctx: Context,
  ): Promise<UserOnboardingStateResponseDto> {
    return this.onboardingService.updateContentProgress(
      ctx.user.id,
      progressData,
      ctx.meta.lang,
    );
  }

  @TypedRoute.Post('categories/action')
  async userActionOnCategory(
    @TypedBody() actionData: UserOnboardingCategoryActionDto,
    @Ctx() ctx: Context,
  ): Promise<UserOnboardingPreferenceResponseDto> {
    return this.onboardingService.userActionOnCategory(
      ctx.user.id,
      actionData,
      ctx.meta.lang,
      ctx.meta.dialect,
    );
  }
}
