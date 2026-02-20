import { ContentTypeEnum, WidgetTypeEnum } from "@/types/variant";
export const WIDGET_TYPES = [
  "normalRow",
  "clickableRow",
  "promotedContentBanner",
  "microDrama",
] as const;
export const ORDER_KEYS_VIEW = [
  "releaseDate",
  "_id",
  "watchCount",
  "totalWatchTime",
  "completion50",
];
export const WIDGET_TYPES_ROWS = [
  WidgetTypeEnum.NORMALROW,
  WidgetTypeEnum.CLICKABLEROW,
  WidgetTypeEnum.PROMOTEDCONTENTBANNER,
] as const;

export const PLATFORMS = ["app", "tv", "web"] as const;

export const CONTENT_TYPES = [
  ContentTypeEnum.SHOW,
  ContentTypeEnum.MOVIE,
  ContentTypeEnum.MIXED,
] as const;

export const ORDER_KEYS = [
  "releaseDate",
  "_id",
  "watchCount",
  "totalWatchTime",
  "completion50",
] as const;

export const SORT_ORDERS = [
  { value: "-1", label: "Descending (-1)" },
  { value: "1", label: "Ascending (1)" },
] as const;
