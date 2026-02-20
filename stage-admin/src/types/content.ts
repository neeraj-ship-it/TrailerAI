export enum ContentStatusEnum {
  ACTIVE = "active",
  DELETED = "deleted",
  DRAFT = "draft",
  INACTIVE = "inactive",
  PREVIEW_PUBLISHED = "preview-published",
  PUBLISH = "publish",
}
export interface ContentData {
  contentDialect: string;
  contentSlug: string;
  contentStatus: ContentStatusEnum;
  contentType: string;
  countEpisodes: number;
  dialect: string;
  displayLanguage: string;
  episodeId: string;
  firebaseMainAppLink: string;
  webPaywallLink: string;
  googleAppLink: string;
  metaAppLink: string;
  showId: string;
  showSlug: string;
  title: string;
  contentWebLink: string;
}

export interface ContentApiResponse {
  data: ContentData[];
  nextPageAvailable: boolean;
  page: number;
  perPage: number;
  totalPages: number;
}
