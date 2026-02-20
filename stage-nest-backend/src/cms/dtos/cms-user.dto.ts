export interface CMSUserRegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface CMSUserLoginDto {
  email: string;
  password: string;
}

export interface CMSUserLoginResponseDto {
  token: string;
  user: CMSUserDetailsDto;
}

export interface CMSUserDetailsDto {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
}
