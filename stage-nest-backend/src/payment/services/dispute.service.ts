import { Injectable } from '@nestjs/common';

import { PaymentStringConstants } from '../constants/payment-string.constant';
import {
  DisputeStatusEnum,
  PaytmDisputeEnum,
  RazorpayDisputeEnum,
} from '../enums/dispute.enums';
import { DisputeRepository } from '../repositories/dispute.repository';
import { DisputeHelperService } from './disputeHelper.service';
import { RazorpayService } from './razorpay.service';

import { IDispute, IUpdateDispute } from 'src/payment/dtos/dispute.interface';
import { ICreateRazorpayDocumentResponse } from 'src/payment/dtos/razorpay/create-document.interface';
import { PaytmDisputeWebhookRequestBodyDto } from 'src/payment/dtos/requests/paytmDisputePayload.request.dto';
import { RazorpayDisputeWebhookRequestBodyDto } from 'src/payment/dtos/requests/razorpayDisputePayload.request.dto';
import { IDisputeWebhookResponse } from 'src/payment/dtos/responses/disputeWebhook.response.interface';

@Injectable()
export class DisputeService {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly disputeHelperService: DisputeHelperService,
    private readonly razorpayService: RazorpayService,
  ) {}

  /**
   * create dispute for the paytm
   *
   * @param {RazorpayDisputeWebhookRequestBodyDto} razorpayDisputeWebhookRequestBodyDto - razorpay dispute payload body
   */
  private async createPaytmDispute(
    paytmDisputeWebhookRequestBodyDto: PaytmDisputeWebhookRequestBodyDto,
  ): Promise<void> {
    // const document: CreateRazorpayDocumentResponseDto =
    //   await this.razorpayService.createRazorpayDocument(paymentId);

    // store the dispute in db
    const dispute: IDispute =
      this.disputeHelperService.convertPaytmDisputePayloadToDispute(
        paytmDisputeWebhookRequestBodyDto,
        'document.id', // FIXME: use actual variables
      );

    // FIXME: type of dispute is IDispute but the save method expects a Dispute entity
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await this.disputeRepository.save(dispute);
    // TODO: contest the dispute after storing it in db
  }

  private async createRazorpayDispute(
    razorpayDisputeWebhookRequestBodyDto: RazorpayDisputeWebhookRequestBodyDto,
  ): Promise<void> {
    const paymentId: string =
      razorpayDisputeWebhookRequestBodyDto.payload.dispute.entity.payment_id;

    const document: ICreateRazorpayDocumentResponse =
      await this.razorpayService.createRazorpayDocument(paymentId);

    // store the dispute in db
    const dispute: IDispute =
      this.disputeHelperService.convertRazorpayDisputePayloadToDispute(
        razorpayDisputeWebhookRequestBodyDto,
        document.id,
      );

    // FIXME: type of dispute is IDispute but the save method expects a Dispute entity
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await this.disputeRepository.save(dispute);

    // contest the dispute after storing it in db
    const { amount, disputeId } = dispute;
    await this.razorpayService.contestRazorpayDispute(
      disputeId,
      amount,
      document.id,
    );
  }

  private async updateRazorpayDisputeStatus(
    razorpayDisputeWebhookRequestBodyDto: RazorpayDisputeWebhookRequestBodyDto,
  ) {
    const { event, payload } = razorpayDisputeWebhookRequestBodyDto;
    const disputeId: string = payload.dispute.entity.id;

    const status: DisputeStatusEnum =
      this.disputeHelperService.convertRazorpayEventToDisputeEnum(event);
    const updateDispute: IUpdateDispute = {
      status,
    };

    return this.disputeRepository.updateDispute(disputeId, updateDispute);
  }

  public async handlePaytmDisputeWebhook(
    signature: string,
    paytmDisputeWebhookRequestBodyDto: PaytmDisputeWebhookRequestBodyDto,
  ): Promise<IDisputeWebhookResponse> {
    // TODO: validate signature for paytm webhook

    const { disputeStatus } = paytmDisputeWebhookRequestBodyDto;

    // handle different dispute events
    switch (disputeStatus) {
      case PaytmDisputeEnum.NEW: {
        await this.createPaytmDispute(paytmDisputeWebhookRequestBodyDto);
        break;
      }
      // for now just updating status for all other dispute events
      case PaytmDisputeEnum.Accept: {
        // TODO: update dispute status for paytm
      }
    }

    // successful webhook response formation
    const disputeWebhookResponse: IDisputeWebhookResponse = {
      msg: PaymentStringConstants.disputeWebhookResponseMsg,
      success: true,
    };

    return disputeWebhookResponse;
  }

  /**
   * create dispute for the razorpay
   *
   * @param {RazorpayDisputeWebhookRequestBodyDto} razorpayDisputeWebhookRequestBodyDto - razorpay dispute payload body
   * @returns {DisputeResponse}
   */
  public async handleRazorpayDisputeWebhook(
    razorpayDisputeWebhookRequestBodyDto: RazorpayDisputeWebhookRequestBodyDto,
  ): Promise<IDisputeWebhookResponse> {
    const { event } = razorpayDisputeWebhookRequestBodyDto;

    // handle different dispute events
    switch (event) {
      case RazorpayDisputeEnum.CREATED: {
        await this.createRazorpayDispute(razorpayDisputeWebhookRequestBodyDto);
        break;
      }
      // for now just updating status for all other dispute events
      case RazorpayDisputeEnum.WON:
      case RazorpayDisputeEnum.UNDER_REVIEW:
      case RazorpayDisputeEnum.LOST:
      case RazorpayDisputeEnum.ACTION_REQUIRED:
      case RazorpayDisputeEnum.CLOSED: {
        await this.updateRazorpayDisputeStatus(
          razorpayDisputeWebhookRequestBodyDto,
        );
      }
    }

    // successful webhook response formation
    const disputeWebhookResponse: IDisputeWebhookResponse = {
      msg: PaymentStringConstants.disputeWebhookResponseMsg,
      success: true,
    };

    return disputeWebhookResponse;
  }
}
