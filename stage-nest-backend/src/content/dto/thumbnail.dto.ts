interface ThumbnailSourceDto {
  gradient?: string;
  sourceLink: string;
}

interface HorizontalThumbnailOrientationDto {
  ratio1?: ThumbnailSourceDto;
  ratio2?: ThumbnailSourceDto;
  ratio3?: ThumbnailSourceDto;
}

interface VerticalThumbnailOrientationDto {
  ratio1?: ThumbnailSourceDto;
}

interface SquareThumbnailOrientationDto {
  ratio1?: ThumbnailSourceDto;
}

interface TvImageThumbnailOrientationDto {
  ratio1?: ThumbnailSourceDto;
}

export interface ThumbnailWithRatioDto {
  horizontal?: HorizontalThumbnailOrientationDto;
  square?: SquareThumbnailOrientationDto;
  tv_image?: TvImageThumbnailOrientationDto;
  vertical?: VerticalThumbnailOrientationDto;
}
export interface ThumbnailDto {
  horizontal?: ThumbnailSourceDto;
  square?: ThumbnailSourceDto;
  tv_image?: ThumbnailSourceDto;
  vertical?: ThumbnailSourceDto;
}
