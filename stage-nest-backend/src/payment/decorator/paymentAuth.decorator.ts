import { applyDecorators, SetMetadata } from '@nestjs/common';

import { PaymentConstants } from '../constants/payment.contant';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { Public } from '@app/auth';

export const PaymentAuth = (provider: PaymentGatewayEnum) => {
  return applyDecorators(
    Public(),
    SetMetadata(PaymentConstants.paymentAuthDecoratorKey, provider),
  );
};
