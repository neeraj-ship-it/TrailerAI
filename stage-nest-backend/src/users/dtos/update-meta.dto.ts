import { ClientAppIdEnum, Dialect } from '@app/common/enums/app.enum';
import { AppsFlyerEventPayload } from '@app/events/services/appsflyer.service';

export interface UpdateUserMetaResponseDto {
  description: string;
  success: boolean;
}

export interface UpdateUserMetaRequestDto {
  appClientId?: ClientAppIdEnum;
  appsflyerData?: AppsFlyerEventPayload;
  firebaseAppInstanceId?: string;
  initialUserCulture?: Dialect;
}
