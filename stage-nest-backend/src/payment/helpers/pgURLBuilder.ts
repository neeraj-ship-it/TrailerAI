export interface PaymentGatewayURLBuilder {
  createExecuteMandateEndpoint: (mandateId: string) => string;
  createMandateEndpoint: () => string;
  createPreDebitNotificationEndpoint: (mandateId: string) => string;
}
