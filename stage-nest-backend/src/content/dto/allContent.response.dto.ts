import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { ContentFormat } from 'common/entities/contents.entity';

export interface AllContentResponseDTO {
  data: AllContentDto[];
}

export interface AllContentDto {
  _id: number;
  displayLanguage: Lang;
  displaySlug: string;
  format?: ContentFormat;
  language: Dialect; //Dialect enum is used in language intentionally to avoid confusion
  thumbnail: ThumbnailWithRatioDto;
  title: string;
  type: ContentType;
}

export interface ProfileSelectionContentDataResponseDto {
  data: { items: ProfileSelectionContentDataDto[] };
}
export interface ProfileSelectionContentDataDto {
  _id: number;
  contentType: ContentType;
  thumbnail: ThumbnailWithURL;
}

export interface ThumbnailWithURL {
  horizontal: string;
  square: string;
  vertical: string;
}
