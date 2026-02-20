export interface TvAdoptionData {
  TVadoptionValue: string | null;
  watch_video_tv: boolean;
}

export enum TvAdoptionRedisValue {
  EXTEND_FREE_SUBSCRIPTION = 'extend_free_subscription',
  EXTEND_FREE_TRIAL = 'extend_free_trial',
}
