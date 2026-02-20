import { ThumbnailDto } from './thumbnail.dto';

export interface VisionularHlsBase {
  hlsSourcelink: string;
  sourceLink: string;
  status: string;
  visionularTaskId: string;
}

export interface Peripheral {
  duration: number;
  hlsSourceLink: string;
  sourceLink: string;
  thumbnail: ThumbnailDto;
  title: string;
  type: string;
  viewCount: number;
  visionularHls?: VisionularHlsBase;
  visionularHlsH265?: VisionularHlsBase;
}
