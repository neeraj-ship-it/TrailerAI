import { Injectable, Logger } from '@nestjs/common';

import {
  CeletelWhatsappGateway,
  CeletelWhatsappGatewayPayload,
} from '../gateways/celetel.whatsapp.gateway';
import { GupshupWhatsappGateway } from '../gateways/gupshup.whatsapp.gateway';
import {
  CeletelNotificationCategory,
  TrialConversionTemplateValues,
  TrialFailTemplateValues,
  TrialSuccessTemplateValues,
} from '../interfaces/celetel-whatsapp-template.interface';
import { WHATSAPP_GATEWAY_PROVIDERS } from '../interfaces/notificationGateway.interface';
import { IWhatsappGatewayAdapter } from '../interfaces/notificationGatewayAdapter.interface';
import {
  SendSubscriptionSuccessNotification,
  SendTrialActivatedNotification,
  SendTrialConversionNotification,
  SendTrialFailNotification,
} from '../interfaces/whatsappPayload.interface';

@Injectable()
export class WhatsappAdapter {
  private gatewayMap: Map<WHATSAPP_GATEWAY_PROVIDERS, IWhatsappGatewayAdapter>;
  private readonly logger = new Logger(WhatsappAdapter.name);

  constructor(
    private readonly celetelWhatsappGateway: CeletelWhatsappGateway,
    private readonly gupshupWhatsappGateway: GupshupWhatsappGateway,
  ) {
    this.gatewayMap = new Map<
      WHATSAPP_GATEWAY_PROVIDERS,
      IWhatsappGatewayAdapter
    >([
      [WHATSAPP_GATEWAY_PROVIDERS.CELETEL, celetelWhatsappGateway],
      [WHATSAPP_GATEWAY_PROVIDERS.GUPSHUP, gupshupWhatsappGateway],
    ]);
  }

  private getGateway(gateway: WHATSAPP_GATEWAY_PROVIDERS) {
    const gatewayAdapter = this.gatewayMap.get(gateway);
    if (!gatewayAdapter) {
      const errMsg = `Gateway not found for provider: ${gateway}`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
    return gatewayAdapter;
  }

  async sendSubscriptionSuccessNotification(
    gateway: WHATSAPP_GATEWAY_PROVIDERS,
    payload: SendSubscriptionSuccessNotification,
  ) {
    const gatewayAdapter = this.getGateway(gateway);

    const celetelWhatsappGatewayPayload: CeletelWhatsappGatewayPayload = {
      ...payload,
      template: CeletelNotificationCategory.SUBSCRIPTION_SUCCESS,
    };

    return gatewayAdapter.sendMessage(celetelWhatsappGatewayPayload);
  }

  async sendTrialActivatedNotification(
    gateway: WHATSAPP_GATEWAY_PROVIDERS,
    payload: SendTrialActivatedNotification,
  ) {
    const gatewayAdapter = this.getGateway(gateway);

    const templateValues: TrialSuccessTemplateValues = {
      ...payload,
    };

    const celetelWhatsappGatewayPayload: CeletelWhatsappGatewayPayload = {
      ...payload,
      template: CeletelNotificationCategory.TRIAL_SUCCESS,
      templateValues: {
        ...templateValues,
      },
    };

    return gatewayAdapter.sendMessage(celetelWhatsappGatewayPayload);
  }

  async sendTrialConversionNotification(
    gateway: WHATSAPP_GATEWAY_PROVIDERS,
    payload: SendTrialConversionNotification,
  ) {
    const gatewayAdapter = this.getGateway(gateway);

    const templateValues: TrialConversionTemplateValues = {
      ...payload,
    };

    const celetelWhatsappGatewayPayload: CeletelWhatsappGatewayPayload = {
      ...payload,
      template: CeletelNotificationCategory.TRIAL_CONVERSION_INTIMATION,
      templateValues: {
        ...templateValues,
      },
    };

    return gatewayAdapter.sendMessage(celetelWhatsappGatewayPayload);
  }

  async sendTrialFailNotification(
    gateway: WHATSAPP_GATEWAY_PROVIDERS,
    payload: SendTrialFailNotification,
  ) {
    const gatewayAdapter = this.getGateway(gateway);

    const templateValues: TrialFailTemplateValues = {
      ...payload,
    };

    const celetelWhatsappGatewayPayload: CeletelWhatsappGatewayPayload = {
      ...payload,
      template: CeletelNotificationCategory.TRIAL_FAIL_APP, // TODO: verify the difference b/w TRIAL_FAIL_APP and TRIAL_FAIL
      templateValues: {
        ...templateValues,
      },
    };

    return gatewayAdapter.sendMessage(celetelWhatsappGatewayPayload);
  }
}
