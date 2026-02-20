import { SetMetadata } from '@nestjs/common';

import { DecoratorConstants } from '@app/common/constants/app.constant';

export const PartnerLogin = () =>
  SetMetadata(DecoratorConstants.PartnerLogin, true);
