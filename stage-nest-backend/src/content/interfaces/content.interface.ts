import { ArtistDto } from '../dto/artist.dto';
import { CategoryDto } from '../dto/category.dto';
import { GenreDto } from '../dto/genre.dto';
import { IEpisode } from '../dto/getShowDetails.response.dto';
import { Peripheral } from '../dto/peripheral.dto';
import { VisionularHlsBase } from '../dto/peripheral.dto';
import { SeasonDto } from '../dto/season.dto';
import { ShowDto } from '../dto/show.dto';
import { ThumbnailDto } from '../dto/thumbnail.dto';
import { VisionularHLS } from '../dto/visionularHLS.dto';
import { EpisodeType } from '../entities/episodes.entity';
import { Show } from '../entities/show.entity';
import { Artist } from '../schemas/artist.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { VisionularHls } from '../schemas/visionularHls.schema';
import { Lang, Dialect } from '@app/common/enums/app.enum';
import { VideoResolution } from '@app/common/enums/media.enum';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';

export interface ShowWithSeasonsAndEpisodes extends Omit<ShowDto, 'seasons'> {
  artistList?: Artist[];
  complianceList?: Compliance[];
  format: ContentFormat;
  genreList: {
    name: string;
    id: number;
  }[];
  latestSeasonReleaseDate: string;
  releaseDate: string;
  seasons: ISeason[];
  status: ShowStatus;
}

export interface ISeason extends Omit<SeasonDto, 'episodes'> {
  episodes: IEpisode[];
}
export interface IPlatterListingShow extends Pick<Show, keyof Show> {
  contentType: string;
  firstEpisodeId?: number;
  firstEpisodeSlug?: string;
  firstSeasonId?: number;
  firstSeasonSlug?: string;
  type: string;
}

export interface IPlatterListingEpisode extends IEpisode {
  firstEpisodeId?: number;
  firstEpisodeSlug?: string;
  firstSeasonId?: number;
  firstSeasonSlug?: string;
  lapsedPercent: number;
}
export interface IPlatterResponse {
  data: {
    referralWidgetId: number;
    label: string;
    platterListing: PlatterResponseDto[] | [];
  };
  responseMessage: string;
}

export interface ThumbnailResponseDto {
  horizontal?: ThumbnailOrientationDto;
  square?: ThumbnailOrientationDto;
  vertical?: ThumbnailOrientationDto;
}

interface ThumbnailOrientationDto {
  ratio1?: ThumbnailSourceDto;
  ratio2?: ThumbnailSourceDto;
  ratio3?: ThumbnailSourceDto;
}
interface ThumbnailSourceDto {
  gradient?: string;
  sourceLink: string;
}

export interface PeripheralResponseDto {
  duration?: number;
  hlsSourceLink?: string;
  sourceLink?: string;
  thumbnail: ThumbnailDto;
  title?: string;
  type?: string;
  viewCount?: number;
  visionularHls?: VisionularHlsBase;
  visionularHlsH265?: VisionularHlsBase;
}

export interface ThemeDto {
  id: number;
  name: string;
}

export interface MoodDto {
  id: number;
  name: string;
}

export interface DescriptorTagDto {
  id: number;
  name: string;
}

export interface ReferenceShowDto {
  display: string;
  id: number;
  slug: string;
  title: string;
  value: number;
}

export interface MediaItemThumbnailDataDto {
  sourceLink: string;
}

export interface MediaItemThumbnailDto {
  horizontal: MediaItemThumbnailDataDto;
  square: MediaItemThumbnailDataDto;
  vertical: MediaItemThumbnailDataDto;
}

export interface SubtitleDto {
  en: string;
  hin: string;
}

export interface MediaItemDto {
  duration: number;
  hlsSourceLink: string;
  id?: number;
  mediaType?: string;
  selectedPeripheralStatus?: boolean;
  sourceLink: string;
  subtitle?: SubtitleDto;
  thumbnail?: MediaItemThumbnailDto;
  title: string;
  type?: string;
  viewCount: number;
  visionularHls?: VisionularHls;
  visionularHlsH265?: VisionularHls;
  visionularHlsHistory?: string[];
}

export interface Subtitle {
  en: string;
  hin: string;
}

export interface ParentDetail {
  seasonTitle?: string;
  slug?: string;
  sourceLink?: string;
  title?: string;
}

export interface Clips {
  audioClip?: string;
  videoClip?: string;
}

export interface VideoFormatDetail {
  bitRate: VideoResolution;
  label: string;
  size: number;
}

export interface ContentWarning {
  endTime: number;
  id: string;
  message: string;
  startTime: number;
  type: string;
}

export interface Compliance {
  id: number;
  name: string;
}

export interface Theme {
  id: number;
  name: string;
}

export interface Mood {
  id: number;
  name: string;
}

export interface DescriptorTag {
  id: number;
  name: string;
}

export interface AllThumbnailsDto extends Thumbnail {
  id?: number;
}

export interface PlatterResponseDto {
  _id: number;
  adsTime?: number[];
  allThumbnails?: AllThumbnailsDto[];
  artistList: ArtistDto[];
  caption?: string;
  categoryList: CategoryDto[];
  clips?: Clips;
  collectionId?: number;
  collectionSlug?: string;
  comingSoonDate?: Date;
  complianceList?: string[] | Compliance[];
  complianceRating?: string;
  consumptionRateCount: number;
  contentType: 'individual' | 'show';
  contentWarnings?: ContentWarning[];
  contributionField?: string;
  crossTrailer?: string;
  deepLink?: string;
  description: string;
  descriptorTags?: DescriptorTag[];
  displayLanguage: Lang;
  duration: number;
  endDate: Date;
  englishValidated: boolean;
  episodeCount?: number;
  episodeOrder?: number;
  feedRandomOrder?: number;
  firstEpisodeId?: number;
  firstEpisodeSlug?: string;
  firstSeasonId?: number;
  firstSeasonSlug?: string;
  format?: ContentFormat;
  freeEpisode?: boolean;
  freeEpisodeDuration?: number;
  genre?: string;
  genreList: GenreDto[];
  hindiValidated: boolean;
  hlsSourceLink?: string;
  id: number;
  introEndTime?: number;
  introStartTime?: number;
  isComingSoon?: number;
  isExclusive: boolean | number;
  isExclusiveOrder?: number;
  isNewContent: boolean;
  isPopularContent?: boolean;
  isPremium?: boolean;
  isScheduled?: boolean;
  keywordSearch?: string;
  label?: string;
  language: Dialect;
  likeConsumptionRatio?: number | null;
  likeCount?: number;
  location?: string;
  mediaAccessTier?: number;
  mediaList?: MediaItemDto[];
  metaDescription?: string;
  metaKeyword?: string;
  metaTags?: string[];
  metaTitle?: string;
  mlTags?: string;
  mood?: string;
  moods?: Mood[];
  nextEpisodeNudgeStartTime?: number;
  order: number;
  parentDetail?: ParentDetail;
  peripheralCount?: number;
  plotKeywords?: string[];
  // preContentWarningText?: string;
  premiumNessOrder?: number | null;
  publishCount?: number;
  randomOrder?: number;
  referenceShowArr?: ReferenceShowDto[];
  referenceShowIds?: number[];
  referenceShowSlugs?: string[];
  releaseDate?: Date | string;
  seasonCount?: number;
  seasonId?: number;
  seasonSlug?: string;
  selectedPeripheral?: Peripheral;
  showId?: number;
  showSlug?: string;
  skipDisclaimer?: boolean;
  slug: string;
  sourceLink?: string;
  startDate: Date;
  status: EpisodeStatus | ShowStatus;
  subGenreList: GenreDto[];
  subtitle?: Subtitle;
  tags: string;
  tg?: string;
  theme?: string;
  themes?: Theme[];
  thumbnail: ThumbnailResponseDto;
  title: string;
  type?: EpisodeType | string;
  videoFormatDetail?: VideoFormatDetail[];
  videoSize?: number;
  viewCount: number;
  visionularHls?: VisionularHLS;
  visionularHlsH265?: VisionularHLS;
  visionularHlsH265History?: string[];
  visionularHlsHistory?: string[];
}
