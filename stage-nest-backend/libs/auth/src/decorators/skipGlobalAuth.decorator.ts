import { SetMetadata } from '@nestjs/common';

import { DecoratorConstants } from '@app/common/constants/app.constant';

export const SkipGlobalAuth = () =>
  SetMetadata(DecoratorConstants.SkipGlobalAuth, true);
