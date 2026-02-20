import { applyDecorators, SetMetadata } from '@nestjs/common';

import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { Public } from '@app/auth';
import { DecoratorConstants } from 'common/constants/app.constant';

export const PaymentAuth = (paymentGateway: PaymentGatewayEnum) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    applyDecorators(
      SetMetadata(DecoratorConstants.PgAuthDecoratorKey, paymentGateway),
      Public(),
    )(target, key, descriptor);
  };
};
