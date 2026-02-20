import { PartnerLoginSource, LoginType } from '@app/common/enums/app.enum';

interface LoginRequestBody {
  loginSource: PartnerLoginSource;
  mobileNumber: string;
  stageLoginType: LoginType;
}

export interface JioLoginRequestDto extends LoginRequestBody {
  connectedOnt?: string; // Add '!'

  deviceId?: string; // Add '!'

  id?: number; // Add '!'

  jToken?: string; // Add '!'

  lbCookie?: string; // Add '!'

  loginType: string;

  methodCalledTime?: number; // Add '!'

  name?: string; // Add '!'

  ssoToken: string; // Add '!'

  subscriberId?: string; // Add '!'

  uniqueId?: string; // Add '!'

  updateTimeStamp?: number; // Add '!'

  username?: string; // Add '!'
}

export interface StcRequest extends LoginRequestBody {
  action?: string;

  amount?: string;

  channel?: string;

  circle?: string;

  endDate?: string;

  operator?: string;

  packName?: string;

  param1?: string;

  startDate?: string;

  transactionId?: string;

  userStatus?: string;

  vendorName?: string;
}

export interface StcLoginRequestDto {
  action?: string;

  amount?: string;

  channel?: string;

  circle?: string;

  endDate?: string;

  msisdn: string;

  operator?: string;

  packName?: string;

  param1?: string;

  pricePointCharged?: string;

  startDate?: string;

  transactionId?: string;

  userStatus?: string;

  vendorName?: string;
}

export type PartnerLoginInterface = JioLoginRequestDto | StcRequest;

// LocationCoordinates.ts
export interface LocationCoordinates {
  lat?: number;
  long?: number;
}

// GeoLocation.ts
export interface GeoLocation {
  lat?: number;
  long?: number;
}

// UserDetail.ts
export interface UserDetail {
  _id?: string;
  subscriptionStatus?: number;
}

// DataUser.ts
export interface DataUser {
  downloadCount?: number;
  favouriteCount?: number;
  isMandateActive?: boolean;
  isNewUser?: boolean;
  onboardingVideoStatus?: boolean;
  subscriptionStatus?: number;
  userDetail?: UserDetail;
}

// UserDetailResponse.ts
export interface UserDetailDTO {
  accessToken: string | null;
  data: DataUser;
  refreshToken: string | null;
}

export interface UserDetailResponse {
  accessToken: string | null;
  data: DataUser;
  refreshToken: string | null;
  responseCode: number;
  responseMessage?: string;
}
