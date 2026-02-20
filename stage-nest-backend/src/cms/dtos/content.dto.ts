import { ArtistStatusEnum } from '@app/common/entities/artist-v2.entity';
import {
  ComplianceRating,
  ContentFormat,
} from '@app/common/entities/contents.entity';
import { ContentStatus } from '@app/common/entities/contents.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentTypeV2 } from '@app/common/enums/common.enums';
import { PeripheralMediaType } from '@app/common/enums/media.enum';

import { MediaStatusEnum } from '@app/common/entities/raw-media.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { SubtitleStatus } from 'common/entities/show-v2.entity';

export interface TimeStamp {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface LocalizedMeta {
  _id?: number;
  description: string;
  slug?: string;
  title: string;
}

export interface LocalizedContent {
  en: LocalizedMeta;
  hin: LocalizedMeta;
}

export interface ThumbnailRatio {
  gradient: string;
  sourceLink: string;
}

export interface ThumbnailDTO {
  horizontal: {
    ratio1: ThumbnailRatio;
    ratio2?: ThumbnailRatio;
    ratio3?: ThumbnailRatio;
    ratio4?: ThumbnailRatio;
  };
  id?: number;
  square: {
    ratio1: ThumbnailRatio;
  };
  vertical: {
    ratio1: ThumbnailRatio;
  };
}

export interface ThumbnailWithCtr {
  horizontal_16_9_ctr: number;
  horizontal_7_2_ctr: number;
  horizontal_tv_ctr?: number;
  square_1_1_ctr: number;
  vertical_2_3_ctr: number;
}

export interface LocalizedMetaWithThumbnail extends LocalizedMeta {
  thumbnails: ThumbnailDTO;
  trailer?: IMediaItem; //make this optional
}

export interface EpisodeDTO {
  duration?: number;
  introEnd: TimeStamp;
  introStart: TimeStamp;
  meta: {
    en: LocalizedMetaWithThumbnail;
    hin: LocalizedMetaWithThumbnail;
  };
  nextEpisodeNudge: TimeStamp;
  order: number;
  rawMediaId: string;
  subtitle: SubtitleResponseDTO | null;
  videoFile: string;
}

export interface SeasonDTO {
  episodes: EpisodeDTO[];
  meta: LocalizedContent;
}

export interface IPeripheralThumbnail {
  horizontal: { sourceLink: string };
  square: { sourceLink: string };
  vertical: { sourceLink: string };
}

export interface IMediaItem {
  description?: string;
  id?: number;
  mediaType: PeripheralMediaType;
  rawMediaId?: string;
  rawMediaStatus?: MediaStatusEnum | null;
  selectedPeripheralStatus?: boolean;
  sourceLink: string;
  thumbnail: IPeripheralThumbnail;
  title: string;
}

export interface IContentMediaItem extends IMediaItem {
  visionularHls: { rawMediaId: string };
  visionularHlsH265: { rawMediaId: string };
}

export interface ShowDTO {
  _id?: number;
  contentId?: number;
  description: string;

  thumbnails: ThumbnailDTO[];
  title: string;
  trailer: IMediaItem[];
  upcomingScheduleText: string;
}

export interface ShowMetaDTO {
  meta: {
    [Lang.EN]: ShowDTO;
    [Lang.HIN]: ShowDTO;
  };
  rawMediaId?: string;
  seasons: SeasonDTO[];
}

export interface LocalizedField {
  en: string;
  hin: string;
}

export interface ArtistV2 {
  character: LocalizedField;
  role: string;
  slug: string;
  type: string;
}

export interface ArtistEntityDto extends ArtistV2 {
  description: LocalizedField;
  image: string;
  name: LocalizedField;
  status: ArtistStatusEnum;
}

export interface BaseShowDTO {
  artistList: ArtistV2[];
  complianceList: number[] | [];
  complianceRating: ComplianceRating | null;
  defaultThumbnailIndex?: number;
  descriptorTags: number[] | [];
  format: ContentFormat;
  genreList: number[] | [];
  gradients: string[];
  moods: number[];
  plotKeywords: string[];
  primaryDialect: Dialect;
  releaseDate: string;
  show: ShowMetaDTO;
  subGenreList: number[] | [];
  targetAudience: string[];
  themes: number[];
}

export interface CreateShowDTO extends BaseShowDTO {
  show: ShowMetaDTO;
}

export interface UpdateShowDTO extends BaseShowDTO {
  status?: ContentStatus;
}

export interface ContentsResponse {
  contentType: ContentTypeV2;
  createdAt: Date;
  createdBy: string;
  description: string;
  dialect: Dialect;
  duration: number;
  error?: string[];
  format: ContentFormat;
  language: Lang;
  oldContentId: number;
  releaseDate: string;
  slug: string;
  status: string;
  thumbnailURL: string;
  title: string;
  transcodingProgress: number;
  transcodingStatus: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface PaginatedResponse {
  items: ContentsResponse[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export enum SortByEnum {
  CONTENT_ID = 'contentId',
  CREATED_AT = 'createdAt',
  RELEASE_DATE = 'releaseDate',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}
export interface ContentFilters {
  contentType?: ContentTypeV2;
  dialect?: Dialect;
  format?: ContentFormat;
  keyword?: string;
  language?: Lang;
  limit: number;
  offset: number;
  sortBy?: SortByEnum;
  sortOrder?: SortOrderEnum;
  status?: ContentStatus;
}

export interface EpisodeResponseDTO extends Omit<EpisodeDTO, 'meta'> {
  _id?: number | string;
  comingSoonDate: Date | null;
  episodeOrder: number;
  isComingSoon: boolean;
  meta: {
    en: LocalizedMetaWithThumbnail;
    hin: LocalizedMetaWithThumbnail;
  };
  rawMediaLink: string | null;
  rawMediaStatus: MediaStatusEnum | null;
  status: EpisodeStatus;
  transcodingStatus: string | null;
}

export interface SeasonResponseDTO {
  episodes: EpisodeResponseDTO[];
  meta: LocalizedContent;
}

interface IMediaItemResponse extends IMediaItem {
  sourceLink: string;
}

export interface ShowResponseDTO {
  _id?: number;
  contentId?: number;
  description: string;
  slug?: string;
  thumbnails: ThumbnailDTO[];
  title: string;
  trailer: IMediaItemResponse[];
  upcomingScheduleText: string;
}

export interface ShowMetaResponseDTO {
  defaultThumbnailIndex?: number;
  meta: {
    [Lang.EN]: ShowResponseDTO;
    [Lang.HIN]: ShowResponseDTO;
  };
  rawMediaId?: string;
  seasons: SeasonResponseDTO[];
}

export interface CombinedShowSeasonEpisodeResponseDTO
  extends Omit<BaseShowDTO, 'show'> {
  /**
   * Index of the thumbnail set selected for this content. Returned for
   * convenience so that clients can quickly determine which thumbnail set is
   * active without traversing nested structures.
   */
  defaultThumbnailIndex?: number;
  dialect: Dialect;
  show: ShowMetaResponseDTO;
  status: ContentStatus;
}

export interface MovieDTO {
  _id?: number;
  contentId?: number;
  description: string;
  slug: string;
  thumbnails: ThumbnailDTO[];
  title: string;
  trailer: IMediaItem[];
  upcomingScheduleText: string;
}

export interface MovieMetaDTO {
  introEnd: TimeStamp;
  introStart: TimeStamp;
  meta: {
    [Lang.EN]: MovieDTO;
    [Lang.HIN]: MovieDTO;
  };
  subtitle: SubtitleResponseDTO | null;
}

export interface BaseMovieDTO {
  artistList: ArtistV2[];
  complianceList: number[] | [];
  complianceRating: ComplianceRating | null;
  defaultThumbnailIndex?: number;
  descriptorTags: number[] | [];
  genreList: number[] | [];
  gradients: string[];
  moods: number[];
  movie: MovieMetaDTO;
  plotKeywords: string[];
  primaryDialect: Dialect;
  rawMediaId: string;
  releaseDate: string;
  status: ContentStatus;
  subGenreList: number[] | [];
  targetAudience: string[];
  themes: number[];
}

export interface CreateOrUpdateMovieDTO extends BaseMovieDTO {
  movie: MovieMetaDTO;
}

export interface MovieResponseDTO extends Omit<BaseMovieDTO, 'movie'> {
  dialect: Dialect;
  format: ContentFormat;
  movie: MovieMetaResponseDTO;
  rawMediaId: string;
  rawMediaLink: string | null;
  rawMediaStatus: MediaStatusEnum | null;
  videoFile: string;
}

export interface SubtitleResponseDTO {
  en: string;
  enMetadata: {
    status: SubtitleStatus;
  } | null;
  hin: string;
  hinMetadata: {
    status: SubtitleStatus;
  } | null;
}

export interface MovieMetaResponseDTO {
  _id?: number | string;
  duration?: number;
  introEnd: TimeStamp;
  introStart: TimeStamp;
  meta: {
    [Lang.EN]: {
      contentId: number;
      description: string;
      label: string;
      slug: string;
      thumbnails: ThumbnailDTO[];
      title: string;
      trailer: IMediaItem[];
      upcomingScheduleText: string;
    };
    [Lang.HIN]: {
      contentId: number;
      description: string;
      label: string;
      slug: string;
      thumbnails: ThumbnailDTO[];
      title: string;
      trailer: IMediaItem[];
      upcomingScheduleText: string;
    };
  };
  subtitle: SubtitleResponseDTO | null;
}

export interface UpcomingContentDetails {
  isLived: boolean;
  publishAt: string | null;
}

export interface UpcomingContentDetailsResponse {
  upcomingContentDetails: UpcomingContentDetails | null;
}

export interface AddOrUpdateContentToComingSoon {
  publishAt: string | null;
  slug: string;
}

export interface CtrThumbnailsResponseDTO {
  thumbnails: ThumbnailWithCtr[];
}

export enum VideoAspectRatioEnum {
  Horizontal = 'Horizontal',
  Vertical = 'Vertical',
}

export interface ScheduleEpisodeDTO {
  contentType: ContentTypeV2;
  dialect: Dialect;
  format: ContentFormat;
  scheduledDate: Date;
  slug: string;
}
