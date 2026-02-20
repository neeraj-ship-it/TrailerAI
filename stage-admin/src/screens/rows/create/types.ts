import { ContentTypeEnum } from "@/types/variant";
import { type ORDER_KEYS, type SORT_ORDERS} from "./constants";

export type OrderKey = typeof ORDER_KEYS[number];
export type SortOrder = typeof SORT_ORDERS[number]['value'];

export interface FormState {
  hin: string;
  en: string;
  status: 'active' | 'inactive';
  widgetType?: string;
  orderKey: string;
  sortOrder: number;
  limit: number;
  notAvailableIn: string[];
  filter: ContentFilters;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Category {
  _id: number;
  name: string;
}

export interface Content {
  title: string;
  slug: string;
  language: string;
}

export interface ContentResponse {
  responseMessage: string;
  data: Content[];
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

export interface ContentFilters {
  isAnd: boolean;
  isOr: boolean;
  genreIds: number[];
  themeIds: number[];
  subGenreIds: number[];
  moodIds: number[];
  descriptorTags: number[];
  contentType: ContentTypeEnum;
  contentSlug: string[];
  format?: 'standard' | 'microdrama';
}