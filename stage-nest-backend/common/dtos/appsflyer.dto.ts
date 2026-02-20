export interface IAppsFlyerShortlinkParams {
  af_og_description?: string;
  af_og_image?: string;
  af_og_title?: string;
  campaign: string;
  deepLinkValue: string;
}

export interface IAppsFlyerUpdateShortlinkParams {
  campaign: string;
  deepLinkValue: string;
  shortlinkId: string;
  ttl?: string;
}

export interface IAppsFlyerShortlinkPayload {
  data: {
    af_dp: string;
    af_og_description?: string;
    af_og_image?: string;
    af_og_title?: string;
    c: string;
    deep_link_value: string;
    pid: string;
  };
  renew_ttl: boolean;
  ttl: string;
}

export interface ShortlinkResponseData {
  short_url: string;
}

export interface ShortlinkResponse {
  data?: ShortlinkResponseData;
  error_message?: string;
  message?: string;
  success: boolean;
}
