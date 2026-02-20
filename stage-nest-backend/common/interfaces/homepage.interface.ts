import { Peripheral } from 'src/content/dto/peripheral.dto';
import { Genre } from 'src/content/schemas/genre.schema';
import { Thumbnail } from 'src/content/schemas/thumbnail.schema';

export enum HomePageContentType {
  MOVIE = 'individual',
  SHOW = 'show',
}
export enum HomePageResponseMessage {
  ERROR = 'error',
  SUCCESS = 'success',
}
export interface IHomePageRowData {
  _id: number;
  complianceRating?: string;
  contentType: HomePageContentType;
  description?: string;
  duration?: number;
  genreList?: Genre[];
  overlayTag?: string;
  releaseDate: string;
  selectedPeripheral?: Peripheral;
  slug: string;
  thumbnail: Thumbnail;
  title: string;
}
export interface IHomePageRowResponse {
  data: IHomePageRowData[];
  responseMessage: HomePageResponseMessage;
}
