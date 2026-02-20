import {
  UserDetailDTO,
  PartnerLoginInterface,
} from '../../dtos/PartnerRequestBody.dto';
import { PartnerLoginSource } from '@app/common/enums/app.enum';

export interface IPartnerService {
  getLoginSource(): PartnerLoginSource;
  partnerSsoLogin(body: PartnerLoginInterface): Promise<UserDetailDTO>;
}
