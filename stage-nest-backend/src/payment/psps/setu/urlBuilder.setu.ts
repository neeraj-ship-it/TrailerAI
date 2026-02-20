import { PaymentGatewayURLBuilder } from 'src/payment/interfaces/pgUrlBuilder.interface';

const API_V1_MANDATES = 'api/v1/merchants/mandates';

export const setuURLBuilder: PaymentGatewayURLBuilder & {
  createLoginEndpoint: () => string;
} = {
  createCheckMandateNotificationStatusEndpoint: ({
    mandateId,
    notificationId,
  }: {
    mandateId: string;
    notificationId: string;
  }) => `${API_V1_MANDATES}/${mandateId}/notify/${notificationId}`,
  createExecuteMandateEndpoint: (mandateId: string) =>
    `${API_V1_MANDATES}/${mandateId}/execute`,
  createLoginEndpoint: () => `v1/users/login`,
  createMandateEndpoint: () => `${API_V1_MANDATES}`,
  createPreDebitNotificationEndpoint: (mandateId: string) =>
    `${API_V1_MANDATES}/${mandateId}/notify`,
};
