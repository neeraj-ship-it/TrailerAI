import { SetMetadata } from '@nestjs/common';

import { DecoratorConstants } from '@app/common/constants/app.constant';

export const PlatformPublic = () =>
  SetMetadata(DecoratorConstants.PlatformPublic, true);
