import { Dialect } from 'common/enums/app.enum';

export interface UserWatchListData {
  action: string;
  city?: string | null;
  country?: string;
  device_id?: string;
  movie_slugs?: string[] | null;
  os?: string;
  profile_id?: string;
  show_slugs?: string[] | null;
  source_widgets?: string[];
  time_of_event: number;
  user_id: string;
}
export enum NcantoInteraction {
  ACQUIRED = 'acquired',
  DISLIKE = 'dislike',
  DOWNLOAD = 'download',
  LIKE = 'like',
  PLAY = 'play',
  PLAY_START = 'playStart',
  SUPERLIKE = 'superlike',
  THUMBNAIL_CLICK = 'click',
  WATCHLIST = 'watchlist',
}

export enum NcantoUserTargeting {
  PROFILE = 'profile',
  SUBSCRIBER = 'subscriber',
}

export enum NcantoEntityLevel {
  MOVIE = 'asset',
  SERIES = 'series',
}

export interface NcantoBlacklistData {
  // expiryDuration?: string // e.g "P30D"
  blacklists: ['default'];
  expiryDatetime: string; // e.g '2025-09-18T23:59:59.0Z'
  level: NcantoEntityLevel[];
  type: NcantoUserTargeting;
}

export interface XRoadMediaUserInteractionData {
  assetId: string;
  autoBlacklisting?: NcantoBlacklistData;
  contextId?: string;
  country?: string;
  deviceId?: string;
  interaction?: NcantoInteraction;
  panelId: string;
  positionSeconds?: number;
  profile?: string;
  ratingEquivalent: number;
  setting?: {
    locationBin?: string | null;
    device?: string | null;
    autoTimeOfDayBin: {
      PT7H: string;
      PT12H: string;
      PT18H: string;
      PT22H: string;
    };
  };
  subscriber: string;
  timestamp?: string;
}

export interface WVEvent {
  app_version: string;
  city?: string | null;
  consumed_duration: number;
  content_id: string;
  content_slug: string;
  content_type: string;
  country?: string | null;
  //data: Record<string, any>;
  device_id: string;
  dialect: string;
  event_type: string;
  language: string;
  os: string;
  platform: string;
  profile_id?: string;
  source_widget?: string;
  timestamp: number;
  total_duration: number;
  user_id: string;
}
export interface BackFillWVEvent {
  CONTENT_DIALECT: Dialect;
  CONTENT_ID: number;
  CONTENT_TYPE: 'tv_show' | 'movie';
  CONTEXT_GE0_CITY: string;
  DEVICE_OS_NAME: string;
  DEVICE_PLATFORM: string;
  event: string;
  ID: string;
  ORIGINAL_TIMESTAMP: string;
  USER_ID: string;
  VIDEO_POSITION_SECONDS: number;
}

export interface BackFillUserInteractionEvent {
  anonymousId: string;
  traits: BackFillWVEvent;
  type: string;
  userId: string;
}

export interface UserInteractionEvent {
  city: string | null; // Used in setting.locationBin
  content_id: string; // Used in episodeRepository.findById()
  content_slug: string;
  content_type: string; // Used in ternary 'film' ? 'MOVIE' : 'EPISODE'
  event_type: string;
  original_timestamp: string | null; // Optional, used in timestamp conversion
  os: string | null; // Used in setting.device
  profile_id?: string;
  source_widget?: string;
  user_id: string; // Used in subscriber field and error logging
}
