import {
  Environment,
  InAppOwnershipType,
  OfferDiscountType,
  OfferType,
  RevocationReason,
  TransactionReason,
  Type,
} from '@apple/app-store-server-library';

export interface ApplePayTransactionPayload {
  /**The UUID that an app optionally generates to map a customer’s in-app purchase with its resulting App Store transaction.**/
  appAccountToken?: string; // optional to support old infra as well
  appTransactionId?: string;
  /**The bundle identifier of an app.**/
  bundleId: string;
  /**The three-letter ISO 4217 currency code for the price of the product.**/
  currency: string;
  /**The server environment, either sandbox or production.**/
  environment: Environment;
  /**The UNIX time, in milliseconds, an auto-renewable subscription expires or renews.**/
  expiresDate: number;
  /**A string that describes whether the transaction was purchased by the user, or is available to them through Family Sharing.**/
  inAppOwnershipType: InAppOwnershipType;
  /**The Boolean value that indicates whether the user upgraded to another subscription.**/
  isUpgraded?: boolean;
  /**The payment mode you configure for an introductory offer, promotional offer, or offer code on an auto-renewable subscription.**/
  offerDiscountType?: OfferDiscountType | string;
  /**The identifier that contains the promo code or the promotional offer identifier.**/
  offerIdentifier?: string;
  /**A value that represents the promotional offer type.**/
  offerType?: OfferType | number;
  /**The purchase date of the transaction associated with the original transaction identifier.**/
  originalPurchaseDate?: number;
  /**The original transaction identifier of a purchase.**/
  originalTransactionId?: string;
  /**The price, in milliunits, of the in-app purchase or subscription offer that you configured in App Store Connect.**/
  price?: number;
  /**The unique identifier for the product, that you create in App Store Connect.**/
  productId?: string;
  /**The time that the App Store charged the user’s account for an in-app purchase, a restored in-app purchase, a subscription, or a subscription renewal after a lapse.**/
  purchaseDate?: number;
  /**The number of consumable products purchased.**/
  quantity?: number;
  /**The UNIX time, in milliseconds, that Apple Support refunded a transaction.**/
  revocationDate?: number;
  /**The reason that the App Store refunded the transaction or revoked it from family sharing.**/
  revocationReason?: RevocationReason | number;
  /**The UNIX time, in milliseconds, that the App Store signed the JSON Web Signature data.**/
  signedDate?: number;
  /**The three-letter code that represents the country or region associated with the App Store storefront for the purchase.**/
  storefront?: string;
  /**An Apple-defined value that uniquely identifies the App Store storefront associated with the purchase.**/
  storefrontId?: string;
  /**The identifier of the subscription group that the subscription belongs to.**/
  subscriptionGroupIdentifier?: string;
  /**The unique identifier for a transaction such as an in-app purchase, restored in-app purchase, or subscription renewal.**/
  transactionId?: string;
  /**The reason for the purchase transaction, which indicates whether it’s a customer’s purchase or a renewal for an auto-renewable subscription that the system initates.**/
  transactionReason?: TransactionReason | string;
  /**The type of the in-app purchase.**/
  type?: Type | string;
  /**The unique identifier of subscription-purchase events across devices, including renewals.**/
  webOrderLineItemId?: string;
}
