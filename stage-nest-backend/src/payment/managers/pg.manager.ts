import { Inject, Injectable } from '@nestjs/common';

import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { CreateMandate } from '../interfaces/createMandate.interface';
import { ParsedWebhook } from '../interfaces/parseWebhook.interface';
import {
  ExecuteMandate,
  PaymentProviderAdapter,
  SendPreDebitNotification,
  VerifyPayload,
} from '../interfaces/paymentProvider.interface';
import { SetuGatewayAdapter } from '../psps/setu/adapter.setu';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class PaymentGatewayManager {
  private readonly paymentGateways: Map<
    PaymentGatewayEnum,
    PaymentProviderAdapter
  >;

  constructor(
    @Inject(SetuGatewayAdapter)
    private readonly setuGatewayAdapter: SetuGatewayAdapter,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {
    this.paymentGateways = new Map<PaymentGatewayEnum, PaymentProviderAdapter>([
      [PaymentGatewayEnum.SETU, this.setuGatewayAdapter],
    ]);
  }
  checkMandateNotificationStatus(
    paymentGateway: PaymentGatewayEnum,
    {
      pgMandateId,
      pgNotificationId,
    }: { pgMandateId: string; pgNotificationId: string },
  ) {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(paymentGateway),
      new Error('Payment provider not found'),
    );
    return paymentProvider.checkMandateNotificationStatus({
      mandateId: pgMandateId,
      notificationId: pgNotificationId,
    });
  }

  createMandate(paymentGateway: PaymentGatewayEnum, mandate: CreateMandate) {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(paymentGateway),
      new Error('Payment provider not found'),
    );
    return paymentProvider.createMandate(mandate);
  }

  executeMandate(pg: PaymentGatewayEnum, mandate: ExecuteMandate) {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(pg),
      new Error('Payment provider not found'),
    );

    return paymentProvider.executeMandate(mandate);
  }

  handleWebhook(
    paymentGateway: PaymentGatewayEnum,
    webhookPayload: unknown,
  ): ParsedWebhook {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(paymentGateway),
      new Error('Payment provider not found'),
    );

    return paymentProvider.parseWebhook(webhookPayload);
  }

  sendPreDebitNotification(
    paymentGateway: PaymentGatewayEnum,
    sendPreDebitNotification: SendPreDebitNotification,
  ) {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(paymentGateway),
      new Error('Payment provider not found'),
    );

    return paymentProvider.sendPreDebitNotification(sendPreDebitNotification);
  }

  verifySignature(
    paymentGateway: PaymentGatewayEnum,
    payload: VerifyPayload,
  ): boolean {
    const paymentProvider = this.errorHandlerService.raiseErrorIfNull(
      this.paymentGateways.get(paymentGateway),
      new Error('Payment provider not found'),
    );
    return paymentProvider.verifySignature(payload);
  }
}
