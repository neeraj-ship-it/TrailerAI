/**
 * Meta Decrypted Data Interface
 * Defines the structure of data received from Meta's encrypted payload
 */
export interface MetaDecryptedDataPayload {
  /** Unique identifier for the account */
  account_id: string;

  /** Unique identifier for the ad */
  ad_id: string;

  /** Objective of the ad (e.g., "APP_INSTALLS") */
  ad_objective_name: string;

  /** Unique identifier for the ad group */
  adgroup_id: string;

  /** Name of the ad group (contains deeplink information) */
  adgroup_name: string;

  /** Unique identifier for the campaign group */
  campaign_group_id: string;

  /** Name of the campaign group */
  campaign_group_name: string;

  /** Unique identifier for the campaign */
  campaign_id: string;

  /** Name of the campaign */
  campaign_name: string;

  /** Extracted deeplink from adgroup_name (added by our service) */
  deeplink?: string;
}
