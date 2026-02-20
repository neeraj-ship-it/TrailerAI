import { TypedRoute, TypedBody, TypedHeaders } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { type PaytmDisputeWebhookRequestBodyDto } from '../dtos/requests/paytmDisputePayload.request.dto';
import { type RazorpayDisputeWebhookRequestBodyDto } from '../dtos/requests/razorpayDisputePayload.request.dto';
import { IDisputeWebhookResponse } from '../dtos/responses/disputeWebhook.response.interface';
import { DisputeService } from '../services/dispute.service';

interface PaytmDisputeWebhookRequestDto {
  signature: string;
}

@Controller('dispute')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @TypedRoute.Post('paytm')
  async paytmDisputeWebhook(
    @TypedBody()
    paytmDisputeWebhookRequestBodyDto: PaytmDisputeWebhookRequestBodyDto,
    @TypedHeaders() headers: PaytmDisputeWebhookRequestDto,
  ): Promise<IDisputeWebhookResponse> {
    return this.disputeService.handlePaytmDisputeWebhook(
      headers.signature,
      paytmDisputeWebhookRequestBodyDto,
    );
  }

  @TypedRoute.Post('razorpay')
  async razorpayDisputeWebhook(
    @TypedBody()
    razorpayDisputeWebhookRequestBodyDto: RazorpayDisputeWebhookRequestBodyDto,
  ): Promise<IDisputeWebhookResponse> {
    return this.disputeService.handleRazorpayDisputeWebhook(
      razorpayDisputeWebhookRequestBodyDto,
    );
  }
}
