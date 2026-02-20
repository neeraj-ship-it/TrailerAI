import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';

import { Logger } from '@nestjs/common';

import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { PaymentGatewayManager } from '../managers/pg.manager';
import { DecoratorConstants } from '@app/common/constants/app.constant';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class PaymentAuthGuard implements CanActivate {
  private logger = new Logger(PaymentAuthGuard.name);
  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly reflector: Reflector,

    @Inject(PaymentGatewayManager)
    private readonly pgManager: PaymentGatewayManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const paymentGateway = this.errorHandlerService.raiseErrorIfNull(
      this.reflector.get<PaymentGatewayEnum>(
        DecoratorConstants.PgAuthDecoratorKey,
        context.getHandler(),
      ),
      Errors.PAYMENT.INVALID_PAYMENT_GATEWAY(),
    );

    switch (paymentGateway) {
      case PaymentGatewayEnum.SETU: {
        const signature = this.errorHandlerService.raiseErrorIfNull(
          request.headers['x-setu-signature'] as string,
          Errors.PAYMENT.INVALID_SIGNATURE(),
        );
        const verificationPayload = this.errorHandlerService.raiseErrorIfNull(
          request?.body,
          Errors.PAYMENT.INVALID_WEBHOOK_PAYLOAD(),
        );
        const isValid = this.pgManager.verifySignature(paymentGateway, {
          signature,
          verificationPayload,
        });
        return isValid;
      }
      case PaymentGatewayEnum.APPLE_PAY: {
        // Apple Pay Encrypt entire payload and send to us. No signature verification required.
        return true;
      }

      default:
        return false;
    }
  }
}
