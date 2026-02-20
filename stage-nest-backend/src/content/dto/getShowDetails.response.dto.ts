import {
  Compliance,
  ContentWarning,
  ParentDetail,
  EpisodeType,
} from '../entities/episodes.entity';
import { SeasonStatus } from '../entities/season.entity';
import { MediaItemDto } from '../interfaces/content.interface';
import { Genre } from '../schemas/genre.schema';
import { Subtitle } from '../schemas/subtitle.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { EpisodeDto } from './episode.dto';
import { FormatDto } from './format.dto';
import { Peripheral } from './peripheral.dto';
import { ShowDto } from './show.dto';
import { TeaserDto } from './teaser.dto';
import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { ArtistListResponseDto } from './upcomingContent.response.dto';
import { Lang } from '@app/common/enums/app.enum';
import { Dialect } from '@app/common/enums/app.enum';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';

export interface GetShowDetailsResponseDTO {
  episodes: EpisodeDto[];
  show: ShowDto;
}

export interface IEpisode {
  _id: number;
  artistList?: ArtistListResponseDto[];
  comingSoonDate?: Date | null;
  complainceRating?: string;
  complianceList?: Compliance[];
  contentType?: EpisodeType;
  contentWarnings?: ContentWarning[];
  dateOverlayText?: string | null;
  description: string;
  displayLanguage: Lang;
  duration: number;
  episodeOrder: number;
  freeEpisode: boolean;
  genreList: Genre[];
  id: number;
  introEndTime?: number;
  introStartTime?: number;
  isLiked?: boolean;
  isPremium?: boolean;
  language: Dialect;
  lapsedPercent: number;
  mediaList?: MediaItemDto[];
  nextEpisodeNudgeStartTime?: number;
  order: number;
  parentDetail: ParentDetail;
  preContentWarningText?: string;
  progress?: number;
  releaseDate?: Date;
  restartPlayback?: boolean;
  seasonId: number;
  seasonSlug: string;
  selectedPeripheral?: Peripheral;
  showId: number;
  showSlug: string;
  slug: string;
  sourceLink: string;
  status: EpisodeStatus;
  subGenreList: Genre[];
  subtitle?: Subtitle;
  teaser?: TeaserDto;
  thumbnail: Thumbnail;
  title: string;
  type: EpisodeType;
  videoFormatDetail: FormatDto[];
}

export interface PaginationInfo {
  currentPage: number;
  pages: {
    pageNumber: number;
    pageStartIndex: number;
    pageEndIndex: number;
    pageUrl: string;
  }[];
}

export interface GetShowDetailsWithProgressResponseDTO {
  data: {
    artistList?: ArtistListResponseDto[];
    contentDetailsCtaText: string;
    complianceList?: Compliance[];
    id: number;
    slug: string;
    likeStatus: string | null;
    seasonSlug: string;
    seasonId: number;
    description: string;
    displayLanguage: string;
    episodes: IEpisode[];
    isPremium: boolean;
    isWatchlistedContent?: boolean;
    language: string;
    seasonDuration: number;
    format?: ContentFormat;
    selectedPeripheral?: Peripheral;
    thumbnail: ThumbnailWithRatioDto;
    title: string;
    totalEpisodes: number;
    totalSeasons: number;
    yearOfRelease: number | null;
    shareCopies: string;
    status: ShowStatus;
    lastSeenDetail: {
      episodeId: number | null;
      seasonId: number;
      episodeSlug: string | null;
      seasonSlug: string;
      showSlug: string;
    };
    upcomingScheduleText?: string;
    pagination?: PaginationInfo;
  };
  seasonList: {
    id: number;
    episodeCount: number;
    seasonOrder: number;
    isNew: boolean;
    status: SeasonStatus;
  }[];
}
