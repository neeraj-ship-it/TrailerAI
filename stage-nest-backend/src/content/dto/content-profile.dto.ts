import { LikeStatusEnum } from '../entities/contentProfile.entity';
import { Dialect } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';

export interface UpdateLikedContentRequestDto {
  contentType: ContentType;
  slug: string;
  sourceWidget?: string;
  status: LikeStatusEnum;
}

export interface LikedContentResponseDto {
  contentType: ContentType;
  dialect: Dialect;
  slug: string;
  status: LikeStatusEnum;
}

export interface UserProfileResponseDto {
  likedContent: LikedContentResponseDto[] | [];
}
