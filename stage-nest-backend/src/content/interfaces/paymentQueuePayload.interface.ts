export enum ContentQueueKeys {
  REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE = 'REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE',
  REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE = 'REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE',
  REEL_RECOMMENDATION_STATICAL_DATA_UPDATE = 'REEL_RECOMMENDATION_STATICAL_DATA_UPDATE',
}

interface ReelRecommendationStaticalDataUpdatePayload {
  key: ContentQueueKeys.REEL_RECOMMENDATION_STATICAL_DATA_UPDATE;
}
interface ReelRecommendationSimilarityDataUpdatePayload {
  key: ContentQueueKeys.REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE;
}
interface ReelRecommendationSerendipityDataUpdatePayload {
  key: ContentQueueKeys.REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE;
}

export type ContentQueuePayload =
  | ReelRecommendationStaticalDataUpdatePayload
  | ReelRecommendationSimilarityDataUpdatePayload
  | ReelRecommendationSerendipityDataUpdatePayload;
