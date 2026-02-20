import { Lang, Dialect } from '@app/common/enums/app.enum';

// Request DTOs
export interface CreateUserRatingRequestDto {
  issue_category_ids?: number[];
  rating: number;
  review_text?: string;
}

export interface GetAppRatingCategoriesRequestDto {
  dialect: Dialect;
  language: Lang;
}

// Response DTOs
export interface UserRatingResponseDto {
  created_at: Date;
  issue_category_ids?: number[];
  rating: number;
  review_text?: string;
  updated_at: Date;
  user_id: string;
}

export interface AppRatingCategoryResponseDto {
  categoryId: number;
  categoryName: string;
  dialect: Dialect;
  language: Lang;
}
