import { Injectable, Logger } from '@nestjs/common';
import ky, { HTTPError, KyInstance } from 'ky';

import { ISmsGatewayAdapter } from '../interfaces/notificationGatewayAdapter.interface';
import {
  SendLoginOtp,
  SendRefundNotification,
} from '../interfaces/smsPayloads.interface';
import { SmsTemplates } from '../templates/sms/sms.template';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class GupshupGateway implements ISmsGatewayAdapter {
  private readonly defaultParams = {
    auth_scheme: 'PLAIN',
    format: 'JSON',
    method: 'sendMessage',
    msg_type: 'TEXT',
    password: APP_CONFIGS.GUPSHUP.SMS.PASSWORD,
    userid: APP_CONFIGS.GUPSHUP.SMS.USER_ID,
    v: '1.1',
  };
  private readonly gupshupSMSApi: KyInstance;
  private readonly logger = new Logger(GupshupGateway.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {
    this.gupshupSMSApi = ky.create({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      prefixUrl: APP_CONFIGS.GUPSHUP.SMS.API_URL,
    });
  }
  async sendLoginOtp(payload: SendLoginOtp) {
    const searchParams = new URLSearchParams({
      ...this.defaultParams,
      msg: SmsTemplates.SEND_LOGIN_OTP.GUPSHUP(payload),
      send_to: payload.recipient,
    });
    await this.errorHandlerService.try(
      () => {
        return this.gupshupSMSApi.post('rest', {
          body: searchParams,
        });
      },
      (error: HTTPError) => {
        this.logger.error({ error });
      },
    );
  }

  async sendRefundNotification(payload: SendRefundNotification) {
    const searchParams = new URLSearchParams({
      ...this.defaultParams,
      format: 'text',
      msg: SmsTemplates.SEND_REFUND_NOTIFICATION.GUPSHUP,
      msg_type: 'unicode_text',
      send_to: payload.phoneNumber,
    });
    await this.errorHandlerService.try(
      () => {
        return this.gupshupSMSApi.post('rest', {
          body: searchParams,
        });
      },
      (error: HTTPError) => {
        this.logger.error({ error });
      },
    );
  }
}
