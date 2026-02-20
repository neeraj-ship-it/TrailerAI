import { Peripheral } from '../schemas/peripheral.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { ContentType } from 'common/enums/common.enums';

export enum SortBy {
  ID = '_id',
  RELEASE_DATE = 'releaseDate',
}
export enum sortOrderEnum {
  ASC = 1,
  DESC = -1,
}
export interface MicroDramaResponseDto {
  data: {
    _id: number;
    slug: string;
    title: string;
    thumbnail: Thumbnail;
    releaseDate: string;
    description: string;
    selectedPeripheral?: Peripheral;
    watchMetrics?: {
      TOTAL_WATCH_TIME: number;
      UNIQUE_WATCHERS: number;
      LAST_7DAYS_UNIQUE_WATCHERS: number;
      COMPLETED_ABOVE_50: number;
    };
  }[];
  responseMessage: string;
}

export interface MicroDramaDto {
  _id: number;
  contentType: ContentType;
  description: string;
  releaseDate: string;
  selectedPeripheral?: Peripheral;
  slug: string;
  thumbnail: Thumbnail;
  title: string;
}

export enum WatchFilterEnum {
  COMPLETED_ABOVE_50 = 'COMPLETED_ABOVE_50',
  LAST_7DAYS_UNIQUE_WATCHERS = 'LAST_7DAYS_UNIQUE_WATCHERS',
  TOTAL_WATCH_TIME = 'TOTAL_WATCH_TIME',
  UNIQUE_WATCHERS = 'UNIQUE_WATCHERS',
}

export interface MicroDramaRequestQuery {
  sortBy?: SortBy;
  sortOrder?: number;
  watchFilter?: WatchFilterEnum;
}
