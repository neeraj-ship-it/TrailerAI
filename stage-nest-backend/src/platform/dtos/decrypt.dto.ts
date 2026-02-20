export interface DecryptRequest {
  cipher: string;
  nonce: string;
}

export interface DecryptResponse {
  deeplink: string;
}
