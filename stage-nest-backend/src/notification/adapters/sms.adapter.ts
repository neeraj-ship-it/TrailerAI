import { Injectable, Logger } from '@nestjs/common';

import { CeletelSMSGateway } from '../gateways/celetel.sms.gateway';
import { GupshupGateway } from '../gateways/gupshup.sms.gateway';
import { SMS_GATEWAY_PROVIDERS } from '../interfaces/notificationGateway.interface';
import { ISmsGatewayAdapter } from '../interfaces/notificationGatewayAdapter.interface';
import {
  SendLoginOtp,
  SendRefundNotification,
} from '../interfaces/smsPayloads.interface';

@Injectable()
export class SmsAdapter {
  private gatewayMap: Map<SMS_GATEWAY_PROVIDERS, ISmsGatewayAdapter>;
  private readonly logger = new Logger(SmsAdapter.name);

  constructor(
    private readonly celetelSMSGateway: CeletelSMSGateway,
    private readonly gupshupGateway: GupshupGateway,
  ) {
    this.gatewayMap = new Map<SMS_GATEWAY_PROVIDERS, ISmsGatewayAdapter>([
      [SMS_GATEWAY_PROVIDERS.CELETEL, celetelSMSGateway],
      [SMS_GATEWAY_PROVIDERS.GUPSHUP, gupshupGateway],
    ]);
  }

  async sendLoginOtp(gateway: SMS_GATEWAY_PROVIDERS, payload: SendLoginOtp) {
    const gatewayAdapter = this.gatewayMap.get(gateway);
    if (!gatewayAdapter) {
      throw new Error('Gateway not found');
    }
    this.logger.debug(`Sending login OTP to ${payload.recipient}`);
    return gatewayAdapter.sendLoginOtp(payload);
  }

  async sendRefundNotification(
    gateway: SMS_GATEWAY_PROVIDERS,
    payload: SendRefundNotification,
  ) {
    const gatewayAdapter = this.gatewayMap.get(gateway);
    if (!gatewayAdapter) {
      throw new Error('Gateway not found');
    }
    this.logger.debug(`Sending refund notification to ${payload.phoneNumber}`);
    return gatewayAdapter.sendRefundNotification(payload);
  }
}
