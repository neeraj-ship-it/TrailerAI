import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import type {
  PaymentOptionsRequestDTO,
  PaymentOptionsResponseDTO,
  PaymentOptionsResponseV2DTO,
} from '../dtos/responses/paymentOptions.response.dto';
import { Ctx } from '@app/auth';
import type { Context } from '@app/auth';
import { PaymentOptionsService } from 'src/payment/services/paymentOptions.service';

@Controller('payment-options')
export class PaymentOptionsController {
  constructor(private readonly paymentOptionsService: PaymentOptionsService) {}

  @TypedRoute.Post()
  async getPaymentOptions(
    @TypedBody() getPaymentOptionsRequest: PaymentOptionsRequestDTO,
    @Ctx() ctx: Context,
  ): Promise<PaymentOptionsResponseDTO> {
    return this.paymentOptionsService.getPaymentOptions(
      getPaymentOptionsRequest,
      ctx.meta.os,
      ctx.meta.platform,
      ctx.user.id,
    );
  }

  @TypedRoute.Post('details')
  async getPaymentOptionsV2(
    @TypedBody() getPaymentOptionsRequest: PaymentOptionsRequestDTO,
    @Ctx() ctx: Context,
  ): Promise<PaymentOptionsResponseV2DTO> {
    return this.paymentOptionsService.getPaymentOptionsWithGroup(
      getPaymentOptionsRequest,
      ctx.meta.os,
      ctx.meta.platform,
      ctx.user.id,
    );
  }
}
