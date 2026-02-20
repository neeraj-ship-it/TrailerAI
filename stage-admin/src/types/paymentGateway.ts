export interface PaymentGatewayItem {
  appName: string;
  packageName: string;
  paymentGateway: string;
  imagePath: string;
  isEnabled: boolean;
  displayText: string;
  supportedPGs: string[];
}

export interface PGChangeDiff {
  type: string;
  appName: string;
  originalIndex?: number;
  updatedIndex?: number;
  property?: string;
  originalValue?: string | boolean;
  updatedValue?: string | boolean;
}

interface PGAppCombination {
  appName: string;
  appPackageName: string;
  supportedPGs: string[];
}

export type PossibleAppCombinations = Record<string, PGAppCombination>;

export interface GETPgConfigResponse {
  customPaymentOptions: PaymentGatewayItem[];
  paymentOptions: PaymentGatewayItem[];
  paywallPaymentOptions: PaymentGatewayItem[];
  possibleAppCombinations: PossibleAppCombinations;
  webPaymentOptions: PaymentGatewayItem[];
}

export interface PatchPGConfigRequest {
  changes: PGChange[];
}

export type PGChange = {
  paymentOption: PaymentOptionsTypeEnum;
  valueChanges: PGValueChange[] | undefined;
  newOrder: number[] | undefined;
};

export type PGValueChange = {
  appName: string;
  paymentGateway?: string;
  isRecommended?: boolean;
  isEnabled?: boolean;
};

export enum PaymentOptionsTypeEnum {
  CUSTOM = "CUSTOM",
  DEFAULT = "DEFAULT",
  PAYWALL = "PAYWALL",
  WEB = "WEB",
}
