import { ContentType } from 'common/enums/common.enums';

export interface GetSignedUrlRequestDto {
  episodeId: string;
}

export interface GetSignedUrlQueryDto {
  appId?: string;
  cdnType?: string;
  os?: string;
  platform?: string;
}

export interface GetSpecialAccessSignedUrlRequestDto {
  appId?: string;
  cdnType?: string;
  episodeId: string;
  os?: string;
  platform?: string;
}

export interface GetBatchSignedUrlRequestDto {
  contentId: number;
  contentType: ContentType.SHOW | ContentType.MOVIE;
  episodeIds: number[];
  expirationTimeInSeconds?: number;
  userId?: string;
}
