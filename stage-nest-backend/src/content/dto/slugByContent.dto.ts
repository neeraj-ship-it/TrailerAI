import { ContentFormat } from 'common/entities/contents.entity';
export interface SlugByContentIdRequestDto {
  contentId: number;
  format?: ContentFormat.MICRO_DRAMA;
}

export interface SlugByContentIdResponseDto {
  contentId: number;
  slug: string;
}
