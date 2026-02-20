import { PaymentAppName } from '@app/common/entities/setting.entity';
import { UpdatePGConfigRequestDTO } from 'src/admin/pg/dtos/updatePGConfig.request.dto';
import { PaymentOptionsEnum } from 'src/admin/pg/enums/paymentOption.enum';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';

export const pgConfigRequest: UpdatePGConfigRequestDTO = {
  changes: [
    {
      newOrder: [2, 1, 3, 4],
      paymentOption: PaymentOptionsEnum.DEFAULT,
      valueChanges: [
        {
          appName: PaymentAppName.PHONEPE,
          paymentGateway: PaymentGatewayEnum.PHONEPE,
        },
        {
          appName: PaymentAppName.PAYTM,
          isRecommended: true,
          paymentGateway: PaymentGatewayEnum.PAYTM,
        },
      ],
    },
  ],
};
