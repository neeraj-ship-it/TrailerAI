import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { CtxUser } from '@app/auth';
import type { ContextUser } from '@app/auth';
import { Lang, Dialect } from '@app/common/enums/app.enum';

import type {
  CreateUserRatingRequestDto,
  UserRatingResponseDto,
  AppRatingCategoryResponseDto,
} from '../dtos/rating.dto';
import { RatingService } from '../services/rating.service';

@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @TypedRoute.Post('user-rating')
  async createRating(
    @TypedBody() body: CreateUserRatingRequestDto,
    @CtxUser() ctxUser: ContextUser,
  ): Promise<UserRatingResponseDto> {
    return this.ratingService.createRating(body, ctxUser.id);
  }

  @TypedRoute.Delete('user-data')
  async deleteUserData(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.ratingService.deleteUserDataFromRedis(ctxUser.id);
  }

  @TypedRoute.Get('app-rating-config')
  async getAppRatingConfig(
    @CtxUser() ctxUser: ContextUser,
    @Req() req: FastifyRequest,
  ): Promise<{
    categories: AppRatingCategoryResponseDto[];
    showAppRatingNudge: boolean;
    ratingNudgeCount: number;
  }> {
    // Extract language and dialect from headers
    const language = req.headers.lang as string;
    const dialect = req.headers.dialect as string;

    // Skip request if language or dialect is missing
    if (!language || !dialect) {
      throw new Error('Missing language or dialect in headers');
    }

    // First check rating stats
    const stats = await this.ratingService.getRatingStats(ctxUser.id);

    // Check conditions: shownCount <= 3 AND ratingGiven is false
    const isEligible = stats.shownCount <= 2 && !stats.ratingGiven;

    // Only increment show count if user is eligible
    if (isEligible) {
      await this.ratingService.incrementShowCountIfNotRated(
        ctxUser.id,
        stats.ratingGiven,
      );
    }

    // Always return categories + showAppRating flag
    const categories = await this.ratingService.getAppRatingCategories({
      dialect: dialect as Dialect,
      language: language as Lang,
    });

    return {
      categories,
      ratingNudgeCount: stats.shownCount + 1,
      showAppRatingNudge: isEligible,
    };
  }

  @TypedRoute.Get('rating-stats')
  async getRatingStats(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<{ shownCount: number; ratingGiven: boolean }> {
    return this.ratingService.getRatingStats(ctxUser.id);
  }

  @TypedRoute.Get('user-rating')
  async getUserRating(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<UserRatingResponseDto | null> {
    return this.ratingService.getUserRating(ctxUser.id);
  }
}
