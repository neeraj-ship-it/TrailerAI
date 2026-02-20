import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { DeeplinkContentType } from '@app/common/enums/common.enums';

export interface ContentDataDto {
  contentDialect: string;
  contentSlug: string;
  contentStatus: string;
  contentType: string;
  contentWebLink: string;
  countEpisodes: number;
  deeplinkContentType: string;
  dialect: string;
  displayLanguage: string;
  episodeId: number;
  firebaseMainAppLink: string;
  googleAppLink: string;
  metaAppLink: string;
  showId: number;
  showSlug: string;
  title: string;
  webPaywallLink: string;
}

export interface GetDeeplinksResponseDto
  extends PaginatedResponseDTO<ContentDataDto> {
  totalPages: number;
}

export interface GetDeeplinksRequestDto {
  contentType?: DeeplinkContentType;
  dialect?: string;
  lang?: string;
  page?: number;
  perPage?: number;
  search?: string;
}
