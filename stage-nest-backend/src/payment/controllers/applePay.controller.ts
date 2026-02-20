import { Controller } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { type ContextUser } from '@app/auth';

import { type CreatePaymentSessionRequestDTO } from '../dtos/requests/applePay.request.dto';
import { ApplePayService } from '../psps/applePay/applePay.service';
import { CtxUser } from '@app/auth';

@Controller('apple-pay')
export class ApplePayController {
  constructor(private readonly applePayService: ApplePayService) {}

  @TypedRoute.Post('initiate')
  async createPaymentSession(
    @TypedBody() createPaymentSessionRequest: CreatePaymentSessionRequestDTO,
    @CtxUser() ctxUser: ContextUser,
  ) {
    return this.applePayService.initiatePaymentSession({
      country: createPaymentSessionRequest.country,
      ctxUser,
      selectedPlan: createPaymentSessionRequest.planId,
    });
  }
}
