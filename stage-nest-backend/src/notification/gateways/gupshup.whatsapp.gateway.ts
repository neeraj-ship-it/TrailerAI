import { Injectable } from '@nestjs/common';
import ky, { KyInstance } from 'ky';

import { WhatsappNotificationKeys } from '../interfaces/notificationKeys.interface';
import { SendTrialActivatedNotification } from '../interfaces/whatsappPayload.interface';
import { WhatsappTemplates } from '../templates/whatsapp/whatsapp.template';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Errors } from '@app/error-handler';

@Injectable()
export class GupshupWhatsappGateway {
  private defaultParams = {
    format: 'json',
    isTemplate: 'true',
    method: 'SENDMEDIAMESSAGE',
    msg_type: 'IMAGE',
    password: APP_CONFIGS.GUPSHUP.WHATSAPP.PASSWORD,
    userid: APP_CONFIGS.GUPSHUP.WHATSAPP.USER_ID,
    v: '1.1',
  };

  private gupshupWhatsappApi: KyInstance;
  constructor() {
    this.gupshupWhatsappApi = ky.create({
      prefixUrl: APP_CONFIGS.GUPSHUP.WHATSAPP.API_URL,
    });
  }

  private getParams(content: string, mediaURL?: string) {
    return new URLSearchParams({
      ...this.defaultParams,
      caption: content,
      ...(mediaURL ? { media_url: mediaURL } : {}),
    });
  }

  async sendMessage() {
    throw Errors.METHOD_NOT_IMPLEMENTED(
      `${GupshupWhatsappGateway.name} did not implemented sendMessage method`,
    );
  }

  async sendTrialActivatedNotificationHaryana(
    payload: SendTrialActivatedNotification,
  ): Promise<void> {
    const { content, mediaURL } =
      WhatsappTemplates[
        WhatsappNotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION_HARYANA
      ](payload);

    const params = this.getParams(content, mediaURL);

    await this.gupshupWhatsappApi.get('', { searchParams: params });
  }
}
