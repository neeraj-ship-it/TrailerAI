export interface PaymentGatewayURLBuilder {
  createCheckMandateNotificationStatusEndpoint: ({
    mandateId,
    notificationId,
  }: {
    mandateId: string;
    notificationId: string;
  }) => string;
  createExecuteMandateEndpoint: (mandateId: string) => string;
  createMandateEndpoint: () => string;
  createPreDebitNotificationEndpoint: (mandateId: string) => string;
}
