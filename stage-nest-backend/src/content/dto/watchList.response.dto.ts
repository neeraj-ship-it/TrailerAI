import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { ContentType } from 'common/enums/common.enums';

export interface Contents {
  _id: number;
  contentType: ContentType;
  releaseDate: string;
  slug: string;
  thumbnail: ThumbnailWithRatioDto;
  title: string;
}

//This response is required for homepage row  addition for watchlist
export interface WatchListedContentsResponseDto {
  data: Contents[] | null;
  responseMessage: string;
}
