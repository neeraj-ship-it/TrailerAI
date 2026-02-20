import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';

import { PaymentAuth } from '../decorators/paymentAuth.decorator';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { PaymentAuthGuard } from '../guard/paymentAuth.guard';
import { PGWebhookManager } from '../managers/pgWebhook.manager';
import { ApplePayService } from '../psps/applePay/applePay.service';
import { type ApplePayWebhookRequestDto } from '../psps/applePay/dto/applePay.webhook.dto';
import { type SetuWebhookPayloadDto } from '../psps/setu/dto/setu.webhook.dto';

@UseGuards(PaymentAuthGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly pgWebhookManager: PGWebhookManager,
    private readonly applePayService: ApplePayService,
  ) {}

  @TypedRoute.Post('/applePay')
  @HttpCode(200)
  @PaymentAuth(PaymentGatewayEnum.APPLE_PAY)
  async handleApplePayWebhook(
    @TypedBody() webhook: ApplePayWebhookRequestDto,
  ): Promise<void> {
    await this.applePayService.handleApplePayWebhook(webhook);
  }

  @TypedRoute.Post('/setu')
  @HttpCode(200)
  @PaymentAuth(PaymentGatewayEnum.SETU)
  async handleSetuWebhook(
    @TypedBody() webhook: SetuWebhookPayloadDto,
  ): Promise<void> {
    await this.pgWebhookManager.handleSetuWebhook(webhook);
    return;
  }
}
