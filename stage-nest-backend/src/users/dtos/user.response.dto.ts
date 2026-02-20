export interface UpdateUserCultureResponseDto {
  initialUserCulture: string;
  userCulture: string;
}

export interface CheckDeviceResponseDto {
  countryCode: string;
  primaryMobileNumber: string;
}

export interface CheckDeviceEnvelopeResponseDto {
  data: CheckDeviceResponseDto;
}
