import { ProfileStatus } from 'common/enums/app.enum';

export enum RedirectionScreen {
  PROFILE_CREATION = 'profile_creation',
  PROFILE_SELECTION = 'profile_selection',
}

export enum SharedUserType {
  ADDITIONAL_PROFILE_USER = 'additional_profile_user',
  EXISTING_DEVICE_USER = 'existing_device_user',
  NEW_DEVICE_USER = 'new_device_user',
}

export interface CreateUserAccountInviteRequestDto {
  inviteCountryCode?: string;
  invitePhoneNumber?: string;
  profileId?: string;
  userDeviceId: string;
}

export interface UpdateUserAccountInviteRequestDto {
  profileDeviceId?: string;
  profileId?: string;
  userId: string;
}

export interface UserAccountInviteResponseDto {
  countryCode?: string;
  inviteCountryCode?: string;
  invitePhoneNumber?: string;
  linkId: string;
  mobileNumber?: string;
  profileDeviceId?: string;
  profileId?: string;
  redirectionScreen?: RedirectionScreen;
  status: ProfileStatus;
  userDeviceId: string;
  userId: string;
  userType?: SharedUserType;
}
export interface UserAccountInviteResponseDtoList {
  data: UserAccountInviteResponseDto[];
  outstandingCount: number;
  totalActiveCount: number;
}
