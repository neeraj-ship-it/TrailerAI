import { Injectable, Logger } from '@nestjs/common';

import { APP_CONFIGS } from '@app/common/configs/app.config';

import ky, { HTTPError, KyInstance } from 'ky';

import { ISmsGatewayAdapter } from '../interfaces/notificationGatewayAdapter.interface';
import {
  SendLoginOtp,
  SendRefundNotification,
} from '../interfaces/smsPayloads.interface';
import { CeletelSmsTemplates } from '../templates/sms/sms.celetel.template';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class CeletelSMSGateway implements ISmsGatewayAdapter {
  #defaultParams = {
    dltPrincipalEntityId: APP_CONFIGS.CELETEL.SMS.PRINCIPAL_ENTITY_ID,
    from: APP_CONFIGS.CELETEL.SMS.FROM,
    password: APP_CONFIGS.CELETEL.SMS.PASSWORD,
    unicode: 'false',
    username: APP_CONFIGS.CELETEL.SMS.USERNAME,
  };
  private readonly celetelSMSApi: KyInstance;
  private readonly logger = new Logger(CeletelSMSGateway.name);
  constructor(private readonly errorHandlerService: ErrorHandlerService) {
    this.celetelSMSApi = ky.create({
      prefixUrl: APP_CONFIGS.CELETEL.SMS.API_URL,
    });
  }
  async sendLoginOtp(payload: SendLoginOtp) {
    const { content, templateId } = CeletelSmsTemplates.SEND_LOGIN_OTP(payload);

    const searchParams = new URLSearchParams({
      ...this.#defaultParams,
      dltContentId: templateId,
      text: content,
      to: payload.recipient,
    });

    await this.errorHandlerService.try(
      () => this.celetelSMSApi.get(`otp?${searchParams.toString()}`),
      (error: HTTPError) => {
        this.logger.error({ error });
      },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendRefundNotification(payload: SendRefundNotification) {
    throw Errors.METHOD_NOT_IMPLEMENTED(
      `${CeletelSMSGateway.name} did not implemented sendRefundNotification method`,
    );
  }
}
