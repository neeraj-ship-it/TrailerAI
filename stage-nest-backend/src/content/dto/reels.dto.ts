import { ReelInteractionType } from '../services/reels.service';
import { ReelStatusEnum, ReelType } from '@app/common/entities/reel.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ShowThumbnail } from 'common/entities/show-v2.entity';
import { ContentType } from 'common/enums/common.enums';

export interface ReelsRequestHeaders {
  dialect: Dialect;
  lang: Lang;
}

export interface GetAllReelsQuery {
  lastReelId?: string;
  limit?: number;
}

export interface GetReelByIdQuery {
  reelId: string;
}

interface ThumbnailDto {
  ratio_9_16: string;
}

export interface ReelResponseDto {
  _id: string;
  contentGenreList: string[];
  contentId: number;
  contentSlug: string;
  contentThumbnail: ShowThumbnail;
  contentTitle: string;
  contentType: ContentType;
  continueWatching: boolean;
  description: string;
  duration: number;
  episodeId?: number;
  id: string;
  isLiked: boolean;
  likesCount: number;
  plotKeywords: string[];
  reelType: ReelType;
  seasonId?: number;
  shareCount: number;
  status: ReelStatusEnum;
  thumbnail: ThumbnailDto | null;
  title: string;
  type: string | null;
  viewCount: number;
  visionularHLS: string;
}

export interface ReelsResponse {
  hasNext: boolean;
  hasPrevious: boolean;
  items: ReelResponseDto[];
}

export interface RegisterActionReelsRequestDto {
  action: ReelInteractionType;
  reelId: string;
}

export interface RegisterActionReelsResponseDto {
  success: boolean;
}

export interface WatchProgressReelsRequestDto {
  count: number;
  reelId: string;
  reelTimestamp: number;
  totalDuration: number;
  watchDuration: number;
}

export interface WatchProgressReelsResponseDto {
  success: boolean;
}
