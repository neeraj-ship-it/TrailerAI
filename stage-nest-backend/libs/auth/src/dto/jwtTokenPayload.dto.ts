export enum UserType {
  ANONYMOUS = 'anonymous',
  NORMAL = 'normal',
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface JwtTokenPayloadDto {
  // appleId: string;
  // email: string;
  exp: number;
  iat: number;
  //  primaryMobileNumber: string;
  profileId?: string; // optional to support old jwt tokens
  rExp: number;
  rId: string;
  type: TokenType;
  userId: string;
}
