export interface CreatePaymentSessionRequestDTO {
  country: string;
  planId: string;
}

export interface CreatePaymentSessionResponseDTO {
  appAccountToken: string;
  productId: string;
  promotionalOffer: {
    nonce: string;
    timestamp: number;
    signature: string;
    identifier: string;
    keyIdentifier: string;
  } | null;
}
