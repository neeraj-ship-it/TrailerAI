import { ContentType } from '@app/common/enums/common.enums';
import { ContentFormat } from 'common/entities/contents.entity';

export interface GroupByGenreRequestDto {
  format?: ContentFormat;
  genreId?: number;
  type?: ContentType;
}
export enum ContentTypeGenreList {
  MICRO_DRAMAS = 'microdramas',
  MOVIES = 'movies',
  SHOWS = 'shows',
}
