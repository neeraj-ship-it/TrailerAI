import {
  ClientAppIdEnum,
  Dialect,
  Lang,
  OS,
  Platform,
} from '@app/common/enums/app.enum';
import { BearerToken } from '@app/common/interfaces/jwt';

export interface AuthenticatedRequestHeadersDto extends RequestHeadersDto {
  authorization: string & BearerToken;
}

export interface InternalAuthRequestHeadersDto {
  'x-internal-api-secret': string;
}

export interface RequestHeadersDto {
  appId?: ClientAppIdEnum;
  authorization?: string;
  dialect: Dialect;
  lang: Lang;
  os: OS;
  platform: Platform;
  'x-app-build'?: string;
}
