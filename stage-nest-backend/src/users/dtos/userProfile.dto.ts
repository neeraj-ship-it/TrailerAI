import {
  GenderEnum,
  Lang,
  Dialect,
  ProfileStatus,
} from 'common/enums/app.enum';

export interface GeoLocationDto {
  coordinates: [number, number];
  type: 'Point';
}

export interface CreateUserProfileRequestDto {
  age?: number;
  avatar: string;
  contentCulture: Dialect;
  displayName: string;
  fullName?: string;
  gender?: GenderEnum;
  language: Lang;
  latitude?: number;
  linkId?: string;
  longitude?: number;
}

export interface UpdateUserProfileRequestDto {
  age?: number;
  avatar?: string;
  contentCulture?: Dialect;
  displayName?: string;
  fullName?: string;
  gender?: GenderEnum;
  language?: Lang;
  latitude?: number;
  longitude?: number;
}

export interface UserProfileDto {
  age?: number;
  avatar: string;
  contentCulture: Dialect;
  displayName: string;
  fullName?: string;
  gender?: GenderEnum;
  isPrimaryProfile: boolean;
  language: Lang;
  latitude?: number;
  longitude?: number;
  profileId: string;
  status: ProfileStatus;
  user: string;
  whatsappSupportNumber?: string;
}

export interface SwitchProfileResponseDto {
  token: string;
  userProfile: UserProfileDto;
}
