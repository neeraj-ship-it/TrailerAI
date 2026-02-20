export enum PlatterContentTypeEnum {
  SHOW = "show",
  MOVIE = "movie",
  INDIVIDUAL = "individual",
}

export enum PlatterTypeEnum {
  D0 = "D0",
  DN = "Dn",
}

export interface ThumbnailRatio {
  gradient: string;
  sourceLink: string;
}

export interface ThumbnailSquare {
  ratio_1_1: ThumbnailRatio;
}

export interface ThumbnailVertical {
  ratio_2_3: ThumbnailRatio;
}

export interface ThumbnailHorizontal {
  ratio_tv: ThumbnailRatio;
  ratio_16_9: ThumbnailRatio;
  ratio_7_2: ThumbnailRatio;
}

export interface Thumbnail {
  square: string;
  horizontal: string;
}

export interface PlatterContentItem {
  id: number;
  title: string;
  thumbnail: Thumbnail;
  slug: string;
  type: PlatterContentTypeEnum;
}

export interface ThumbnailV2 {
  ratio1: ThumbnailRatio;
  ratio2: ThumbnailRatio;
  ratio3: ThumbnailRatio;
  ratio4: ThumbnailRatio;
}

export interface PlatterItem {
  thumbnail: ThumbnailV2;
  slug: string;
  contentType: PlatterContentTypeEnum;
}

export type PlatterContentResponse = PlatterContentItem[];
