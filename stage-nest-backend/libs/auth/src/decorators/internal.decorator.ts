import { SetMetadata } from '@nestjs/common';

import { DecoratorConstants } from '@app/common/constants/app.constant';

export const Internal = () => SetMetadata(DecoratorConstants.Internal, true);
