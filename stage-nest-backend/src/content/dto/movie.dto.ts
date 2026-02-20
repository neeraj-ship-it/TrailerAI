import { CategoryDto } from './category.dto';
import { ComplianceDto } from './compliance.dto';
import { ContentWarningDto } from './contentWarning.dto';
import { SubtitleDto } from './episode.dto';
import { FormatDto } from './format.dto';
import { GenreDto } from './genre.dto';
import { Peripheral } from './peripheral.dto';
import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { ArtistListResponseDto } from './upcomingContent.response.dto';
import { VisionularHLS } from './visionularHLS.dto';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { EpisodeStatus } from 'common/entities/episode.entity';

export interface MovieDto {
  _id: number;
  artistList?: ArtistListResponseDto[];
  categoryList: CategoryDto[];
  chatbotFab: boolean;
  complianceList?: ComplianceDto[];
  complianceRating?: string;
  contentWarnings?: ContentWarningDto[];
  description: string;
  displayLanguage: Lang;
  duration: number;
  genreList: GenreDto[];
  introEndTime: number | null;
  introStartTime: number | null;
  isPremium?: boolean;
  language: Dialect;
  nextContentNudgeStartTime?: number;
  order: number;
  preContentWarningText?: string;
  selectedPeripheral?: Peripheral;
  slug: string;
  sourceLink: string;
  status: EpisodeStatus;
  subtitle?: SubtitleDto;
  thumbnail: ThumbnailWithRatioDto;
  title: string;
  videoFormatDetails: FormatDto[];
  visionularHls?: VisionularHLS; // TODO: remove after sometime when old app versions totally degraded
  yearOfRelease: number | null;
}
