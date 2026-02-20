import { EpisodeType } from '../entities/episodes.entity';
import { FormatDto } from './format.dto';
import { GenreDto } from './genre.dto';
import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { Dialect, Lang } from '@app/common/enums/app.enum';

export interface EpisodeDto {
  _id: number;
  description: string;
  displayLanguage: Lang;
  duration: number;
  episodeOrder: number;
  freeEpisode: boolean;
  genreList: GenreDto[];
  introEndTime: number | null;
  introStartTime: number | null;
  isPremium?: boolean;
  language: Dialect;
  nextEpisodeNudgeStartTime?: number;
  order: number;
  slug: string;
  subtitle?: SubtitleDto;
  thumbnail: ThumbnailWithRatioDto;
  title: string;
  type: EpisodeType;
  videoFormatDetails: FormatDto[];
}

export interface SubtitleDto {
  en: string;
  hin: string;
}
