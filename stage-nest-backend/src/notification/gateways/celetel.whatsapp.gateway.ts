import { Injectable, Logger } from '@nestjs/common';

import axios from 'axios';

import {
  CeletelNotificationCategory,
  TrialConversionTemplateValues,
  TrialFailTemplateValues,
  TrialSuccessTemplateValues,
} from '../interfaces/celetel-whatsapp-template.interface';
import { celetelWhatsAppTemplates } from '../templates/whatsapp/celetel-whatsapp.template';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Dialect } from '@app/common/enums/app.enum';

export interface CeletelWhatsappGatewayPayload {
  dialect: Dialect;
  phoneNumber: string;
  template: CeletelNotificationCategory;
  templateValues?:
    | TrialSuccessTemplateValues
    | TrialFailTemplateValues
    | TrialConversionTemplateValues;
}

@Injectable()
export class CeletelWhatsappGateway {
  private logger = new Logger(CeletelWhatsappGateway.name);
  private senderNumberMapping: Record<Dialect, string> = {
    [Dialect.BHO]: APP_CONFIGS.CELETEL.WHATSAPP.NUMBERS.BHO,
    [Dialect.GUJ]: APP_CONFIGS.CELETEL.WHATSAPP.NUMBERS.GUJ,
    [Dialect.HAR]: APP_CONFIGS.CELETEL.WHATSAPP.NUMBERS.HAR,
    [Dialect.RAJ]: APP_CONFIGS.CELETEL.WHATSAPP.NUMBERS.RAJ,
  };

  async sendMessage({
    dialect,
    phoneNumber,
    template,
    templateValues,
  }: CeletelWhatsappGatewayPayload) {
    const senderMobileNumber = this.senderNumberMapping[dialect];
    this.logger.log(`Sending celetel whatsapp notification:${template}`);

    const content = celetelWhatsAppTemplates[dialect][template](templateValues);

    const data = {
      message: {
        channel: 'WABA',
        content: content.templateContent,
        preferences: {
          webHookDNId: '1001',
        },
        recipient: {
          recipient_type: 'individual',
          reference: {},
          to: phoneNumber,
        },
        sender: {
          from: senderMobileNumber,
        },
      },
      metaData: {
        version: 'v1.0.9',
      },
    };

    const url = APP_CONFIGS.CELETEL.WHATSAPP.API_URL;
    const config = {
      headers: {
        Authentication: `Bearer ${APP_CONFIGS.CELETEL.WHATSAPP.AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    await axios.post(url, data, config);
  }
}
