export interface CreateArtistDto {
  description: {
    en: string;
    hin: string;
  };
  image: string;
  name: {
    en: string;
    hin: string;
  };
}

export interface ArtistDetailsDto {
  description: {
    en: string;
    hin: string;
  };
  id: string;
  image: string;
  name: {
    en: string;
    hin: string;
  };
  slug?: string;
}

export interface GenerateArtistImageUploadUrlDto {
  artistId: string;
  contentType: string;
  fileExtension: string;
}

export interface DeleteArtistRequestDto {
  artistId: string;
}

export interface GenerateImageUploadUrlResponseDto {
  fileUrl: string;
  url: string;
}

export interface GetArtistDetailsQueryDto {
  id: string;
}

export interface SearchArtistQueryDto {
  name: string;
}
