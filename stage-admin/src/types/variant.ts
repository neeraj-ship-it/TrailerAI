import { ContentFilters } from "@/screens/rows/create/types";
export interface VariantData {
  _id: string;
  name: string;
  status: string;
  rowSequence: string[];
  availableIn: string[];
  userSubscriptionStatus: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariantsResponse {
  responseMessage: string;
  data: VariantData[];
}

export interface VariantResponse {
  responseMessage: string;
  data: VariantData;
}

export interface RowData {
  _id: string;
  hin: string;
  en: string;
  status: string;
  widgetType: string;
  rowKey: string;
  orderKey: string;
  sortOrder: number | null;
  limit: number;
  apiUrl: string;
  notAvailableIn: string[];
  createdAt: string;
  updatedAt: string;
  filter: {
    isAnd: boolean;
    isOr: boolean;
    genreIds: string[];
    themeIds: string[];
    subGenreIds: string[];
    moodIds: string[];
    descriptorTags: string[];
    contentType: string;
    contentSlug: string[];
  };
}

export interface RowsResponse {
  responseMessage: string;
  data: RowData[];
} 


export enum PlatformOptionEnum {
  APP = "app",
  WEB = "web",
  TV = "tv",
}

export enum WidgetTypeEnum {
  NORMALROW = "normalRow",
  CLICKABLEROW = "clickableRow",
  PROMOTEDCONTENTBANNER = "promotedContentBanner"
}


export enum ContentTypeEnum {
  SHOW = "show",
  MOVIE = "movie",
  MIXED = "mixed",
}

export interface RowResponse {
  responseMessage: string;
  data: {
    _id: string;
    hin: string;
    en: string;
    status: string;
    widgetType: string;
    rowKey: string;
    orderKey: string;
    sortOrder: number;
    limit: number;
    notAvailableIn: string[];
    filter: ContentFilters;
  };
}
