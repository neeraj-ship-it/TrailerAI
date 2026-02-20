export interface ThumbnailRatioResponseDto {
  gradient?: string;
  sourceLink: string;
}

export interface ThumbnailOrientationResponseDto {
  ratio1?: ThumbnailRatioResponseDto;
  ratio2?: ThumbnailRatioResponseDto;
  ratio3?: ThumbnailRatioResponseDto;
  ratio4?: ThumbnailRatioResponseDto;
}

export interface ThumbnailResponseDto {
  horizontal?: ThumbnailOrientationResponseDto;
  square?: ThumbnailOrientationResponseDto;
  tv_image?: ThumbnailOrientationResponseDto;
  vertical?: ThumbnailOrientationResponseDto;
}

export interface MediaListResponseDto {
  duration: number;
  hlsSourceLink: string;
  id: number;
  selectedPeripheralStatus: boolean;
  sourceLink: string;
  thumbnail: ThumbnailResponseDto;
  title: string;
  type: string;
  viewCount: number;
}

export interface ArtistListResponseDto {
  callingName?: string;
  city: string;
  display?: string;
  firstName?: string;
  gender: string;
  id: number;
  lastName?: string;
  name: string;
  order: number;
  profilePic: string;
  slug: string;
  status: string;
  value?: number;
}

export interface ComingSoonItemResponseDto {
  _id: number;
  artistList: ArtistListResponseDto[];
  contentType?: string;
  displayLanguage: string;
  displayMedia?: string;
  isLived?: boolean;
  language: string;
  mediaList: MediaListResponseDto[];
  posterReleaseDate: Date;
  releaseDate: Date;
  title: string;
  trailerReleaseDate: Date;
}

export interface ComingSoonResponseDto {
  comingSoonListing: ComingSoonItemResponseDto[];
  label: string;
  referralWidgetId: number;
}
