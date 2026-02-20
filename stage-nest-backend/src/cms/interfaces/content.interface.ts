import { ObjectId } from '@mikro-orm/mongodb';

import {
  IMediaItem,
  SortByEnum,
  SortOrderEnum,
  ThumbnailDTO,
  TimeStamp,
} from '../dtos/content.dto';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentTypeV2 } from '@app/common/enums/common.enums';
import { ArtistStatusEnum } from 'common/entities/artist-v2.entity';
import {
  ComplianceRating,
  ContentStatus,
  ContentFormat,
} from 'common/entities/contents.entity';
import { SubtitleMetadata } from 'common/entities/show-v2.entity';

// Core domain interfaces
export interface INameable {
  id: number;
  name: string;
}

export interface ILocalizable {
  en: string;
  hin: string;
}

export interface IMedia {
  gradient: string;
  sourceLink: string;
}

export interface IThumbnail {
  horizontal: {
    ratio_16_9: IMedia;
    ratio_7_2: IMedia;
    ratio_tv?: IMedia;
  };
  square: {
    ratio1_1: IMedia;
  };
  vertical: {
    ratio2_3: IMedia;
  };
}

export interface IContent {
  artists: IArtist[] | [];
  description: string;
  descriptorTags: INameable[] | [];
  genres: INameable[] | [];
  label: string;
  moods: INameable[] | [];
  subGenres: INameable[] | [];
  themes: INameable[] | [];
  thumbnail?: IThumbnail;
  title: string;
  trailer?: IMediaItem;
  upcomingScheduleText?: string;
}

export interface ILocalizedContent {
  en: IContent;
  hin: IContent;
}

export interface IArtist {
  _id?: ObjectId;
  character: ILocalizable;
  description: ILocalizable;
  image: string;
  name: ILocalizable;
  role: string;
  slug: string;
  status: ArtistStatusEnum;
  type: string;
}

export interface IBaseContent {
  defaultThumbnailIndex?: number;
  dialect: Dialect;
  gradients: string[];
  plotKeywords?: string[];
  primaryDialect?: Dialect;
  releaseDate?: string;
  targetAudience?: string[];
}

// Content creation interfaces
export interface CreateDraftShowPayload extends IBaseContent {
  complianceList: INameable[];
  complianceRating: ComplianceRating | null;
  duration: number;
  endDate: Date;
  episodeCount: number;
  format: ContentFormat;
  meta: ILocalizedContent;
  plotKeywords: string[];
  primaryDialect: Dialect;
  releaseDate: string;
  seasonCount: number;
  showMediaId: string;
  slug: string;
  targetAudience: string[];
  userName: string;
}

export interface CreateDraftSeasonPayload extends IBaseContent {
  contentSlug: string;
  contributionField: string;
  endDate: Date;
  episodeCount: number;
  meta: {
    en: {
      showId: number;
      description: string;
      title: string;
      genres: INameable[];
      categoryList: INameable[];
      subGenres: INameable[];
    };
    hin: {
      showId: number;
      description: string;
      title: string;
      genres: INameable[];
      subGenres: INameable[];
      categoryList: INameable[];
    };
  };
  startDate: Date;
}

export interface CreateDraftMoviePayload extends IBaseContent {
  complianceList: INameable[];
  complianceRating: ComplianceRating | null;
  duration: number;
  endDate: Date;
  meta: ILocalizedContent;
  movieMediaId: string;
  plotKeywords: string[];
  primaryDialect: Dialect;
  releaseDate: string;
  slug: string;
  targetAudience: string[];
  userName: string;
}

export interface AllContentRequestQuery {
  contentType?: ContentTypeV2;
  dialect?: Dialect;
  format?: ContentFormat;
  keyword?: string;
  language?: Lang;
  page?: number;
  perPage?: number;
  sortBy?: SortByEnum;
  sortOrder?: SortOrderEnum;
  status?: ContentStatus;
}

export interface ISubtitle {
  en: string | null;
  enMetadata: SubtitleMetadata | null;
  hin: string | null;
  hinMetadata: SubtitleMetadata | null;
}

export interface DraftEpisodes {
  dialect: Dialect;
  duration: number;
  en: {
    showId: number;
    seasonId: number;
    title: string;
    description: string;

    genreList: INameable[];
    subGenreList: INameable[];
    thumbnail: ThumbnailDTO;
  };
  episodeOrder?: number;
  hin: {
    showId: number;
    seasonId: number;
    title: string;
    description: string;
    genreList: INameable[];
    subGenreList: INameable[];
    thumbnail: ThumbnailDTO;
  };
  introEndTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  introStartTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  nextEpisodeNudgeStartTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  order: number;
  rawMediaId: string;
  seasonSlug: string;
  showSlug: string;
  subtitle: ISubtitle | null;
}

export interface CreateMoviePayload {
  complianceRating: ComplianceRating | null;
  defaultThumbnailIndex: number;
  dialect: Dialect;
  duration: number;
  en: {
    description: string;
    genreList: INameable[];
    subGenreList: INameable[];
    themes: INameable[];
    moods: INameable[];
    descriptorTag: INameable[];
    subtitle?: string;
    thumbnails: ThumbnailDTO[];
    title: string;
    upcomingScheduleText?: string;
  };
  hin: {
    themes: INameable[];
    moods: INameable[];
    descriptorTag: INameable[];
    description: string;
    genreList: INameable[];
    subGenreList: INameable[];
    subtitle?: string;
    thumbnails: ThumbnailDTO[];
    title: string;
    upcomingScheduleText?: string;
  };
  introEndTime: TimeStamp;
  introStartTime: TimeStamp;
  rawMediaId: string;
  slug: string;
  userName: string;
}

export interface EpisodeGenreDto {
  id: number;
  name: string;
}
