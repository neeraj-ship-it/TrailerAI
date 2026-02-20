import { Injectable } from '@nestjs/common';

import { IDispute } from '../dtos/dispute.interface';
import { DisputeStatusEnum, RazorpayDisputeEnum } from '../enums/dispute.enums';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { convertEpochToDateTime } from 'common/helpers/dateTime.helper';
import { PaytmDisputeWebhookRequestBodyDto } from 'src/payment/dtos/requests/paytmDisputePayload.request.dto';
import { RazorpayDisputeWebhookRequestBodyDto } from 'src/payment/dtos/requests/razorpayDisputePayload.request.dto';

@Injectable()
export class DisputeHelperService {
  public convertPaytmDisputePayloadToDispute(
    paytmDisputeWebhookRequestBodyDto: PaytmDisputeWebhookRequestBodyDto,
    pgDocumentId: string,
  ): IDispute {
    const {
      disputeAmount,
      disputeDueDate,
      disputeId,
      disputeType,
      transactionId,
    } = paytmDisputeWebhookRequestBodyDto;

    const dispute: IDispute = {
      amount: disputeAmount,
      disputeDeadlineTime: disputeDueDate,
      disputeId,
      disputeTime: new Date(),
      errorMessage: disputeType,
      payload: paytmDisputeWebhookRequestBodyDto,
      paymentGateway: PaymentGatewayEnum.PAYTM,
      paymentId: transactionId, // REVIEW_THIS: using transactionId as paymentId for paytm dispute
      pgDocumentId,
      status: DisputeStatusEnum.CREATED,
    };

    return dispute;
  }

  public convertRazorpayDisputePayloadToDispute(
    razorpayDisputeWebhookRequestBodyDto: RazorpayDisputeWebhookRequestBodyDto,
    pgDocumentId: string,
  ): IDispute {
    const { payload } = razorpayDisputeWebhookRequestBodyDto;

    const {
      amount,
      created_at,
      id: disputeId,
      respond_by,
    } = payload.dispute.entity;

    const { id: paymentId } = payload.payment.entity;

    const dispute: IDispute = {
      amount,
      disputeDeadlineTime: convertEpochToDateTime(respond_by),
      disputeId,
      disputeTime: convertEpochToDateTime(created_at),
      errorMessage: '',
      payload,
      paymentGateway: PaymentGatewayEnum.RAZORPAY,
      paymentId,
      pgDocumentId,
      status: DisputeStatusEnum.CREATED,
    };

    return dispute;
  }

  // convert razorpay event to common dispute enum for pgs
  public convertRazorpayEventToDisputeEnum(event: string): DisputeStatusEnum {
    switch (event) {
      case RazorpayDisputeEnum.CREATED: {
        return DisputeStatusEnum.CREATED;
      }
      case RazorpayDisputeEnum.WON: {
        return DisputeStatusEnum.WON;
      }
      case RazorpayDisputeEnum.UNDER_REVIEW: {
        return DisputeStatusEnum.UNDER_REVIEW;
      }
      case RazorpayDisputeEnum.LOST: {
        return DisputeStatusEnum.LOST;
      }
      case RazorpayDisputeEnum.ACTION_REQUIRED: {
        return DisputeStatusEnum.ACTION_REQUIRED;
      }
      case RazorpayDisputeEnum.CLOSED: {
        return DisputeStatusEnum.CLOSED;
      }
    }

    return DisputeStatusEnum.CREATED;
  }
}
