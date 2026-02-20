import { Injectable } from '@nestjs/common';

import {
  CreateUserRatingRequestDto,
  GetAppRatingCategoriesRequestDto,
  UserRatingResponseDto,
  AppRatingCategoryResponseDto,
} from '../dtos/rating.dto';

import { AppRatingCategory } from '@app/common/entities/appRatingCategory.entity';
import { AppRatingCategoryRepository } from '@app/common/repositories/appRatingCategory.repository';
import { UserRatingRepository } from '@app/common/repositories/userRating.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { RedisService } from '@app/redis';
import { RedisKeyBuilders } from '@app/redis';
import { UserInternalRating } from 'common/entities/userInternalRating.entity';

@Injectable()
export class RatingService {
  constructor(
    private readonly appRatingCategoryRepository: AppRatingCategoryRepository,
    private readonly userRatingRepository: UserRatingRepository,
    private readonly redisService: RedisService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  // Redis helper methods

  private async setRatingGiven(userId: string): Promise<void> {
    try {
      const key = `rating_${userId}_ratingGiven`;
      await this.redisService.set(key, 'true', 30 * 24 * 60 * 60); // 30 days TTL
      console.log(`Redis: Set rating given for user ${userId}`);
    } catch (error) {
      console.error(`Redis Error (setRatingGiven):`, error);
    }
  }

  private toCategoryResponseDto(
    category: AppRatingCategory,
  ): AppRatingCategoryResponseDto {
    return {
      categoryId: Number(category.categoryId),
      categoryName: category.categoryName,
      dialect: category.dialect,
      language: category.language,
    };
  }

  // Helper methods for DTO transformation
  private toUserRatingResponseDto(
    rating: UserInternalRating,
  ): UserRatingResponseDto {
    return {
      created_at: rating.createdAt,
      issue_category_ids: rating.issue_category_ids,
      rating: rating.rating,
      review_text: rating.review_text,
      updated_at: rating.updatedAt,
      user_id: rating.user_id,
    };
  }

  // Create or update user rating with array issue_category_ids
  async createRating(
    payload: CreateUserRatingRequestDto,
    userId: string,
  ): Promise<UserRatingResponseDto> {
    // Create or update rating in MongoDB
    const rating = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRatingRepository.createOrUpdate(userId, {
        issue_category_ids: payload.issue_category_ids,
        rating: payload.rating,
        review_text: payload.review_text,
        user_id: userId,
      }),
      Errors.USER.USER_PROFILE_NOT_CREATED(),
    );

    // Set rating given flag
    await this.setRatingGiven(userId);

    return this.toUserRatingResponseDto(rating);
  }

  async deleteUserDataFromRedis(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Delete rating-related keys
      const ratingKeys = [
        `rating_${userId}_shownCount`,
        `rating_${userId}_ratingGiven`,
      ];

      // Delete statsig user key
      const statsigKey = RedisKeyBuilders.statsigUser.user(userId);

      // Delete all keys
      const keysToDelete = [...ratingKeys, statsigKey];
      const deletePromises = keysToDelete.map((key) =>
        this.redisService.del(key),
      );

      await Promise.all(deletePromises);

      console.log(`Redis: Deleted user data for user ${userId}`);

      return {
        message: `Successfully deleted user data from Redis for user ${userId}`,
        success: true,
      };
    } catch (error) {
      console.error(`Redis Error (deleteUserDataFromRedis):`, error);
      return {
        message: `Failed to delete user data from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
      };
    }
  }

  // Get app rating categories by language and dialect
  async getAppRatingCategories(
    payload: GetAppRatingCategoriesRequestDto,
  ): Promise<AppRatingCategoryResponseDto[]> {
    const categories =
      await this.appRatingCategoryRepository.findByLanguageAndDialect(
        payload.language,
        payload.dialect,
      );

    return categories.map((category) => this.toCategoryResponseDto(category));
  }

  // Get rating statistics from Redis
  async getRatingStats(
    userId: string,
  ): Promise<{ shownCount: number; ratingGiven: boolean }> {
    try {
      const [shownCount, ratingGiven] = await Promise.all([
        this.redisService.get(`rating_${userId}_shownCount`),
        this.redisService.get(`rating_${userId}_ratingGiven`),
      ]);

      return {
        ratingGiven: ratingGiven === 'true',
        shownCount: Number(shownCount) || 0,
      };
    } catch (error) {
      console.error(`Redis Error (getRatingStats):`, error);
      return {
        ratingGiven: false,
        shownCount: 0,
      };
    }
  }

  // Get user rating by user_id
  async getUserRating(userId: string): Promise<UserRatingResponseDto | null> {
    // Increment show count when rating dialog is shown

    // Get rating from MongoDB
    const rating = await this.userRatingRepository.findByUserId(userId);

    return rating ? this.toUserRatingResponseDto(rating) : null;
  }

  async incrementShowCountIfNotRated(
    userId: string,
    ratingGiven: boolean,
  ): Promise<void> {
    try {
      if (!ratingGiven) {
        const key = `rating_${userId}_shownCount`;
        await this.redisService.incr(key);
        // No TTL for this specific use case
        console.log(
          `Redis: Incremented show count for user ${userId} (categories API)`,
        );
      } else {
        console.log(
          `Redis: Skipped incrementing show count for user ${userId} (already rated)`,
        );
      }
    } catch (error) {
      console.error(`Redis Error (incrementShowCountIfNotRated):`, error);
      // Continue request even if Redis fails
    }
  }
}
