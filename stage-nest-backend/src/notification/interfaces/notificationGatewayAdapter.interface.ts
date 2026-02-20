import { CeletelWhatsappGatewayPayload } from '../gateways/celetel.whatsapp.gateway';
import { SendLoginOtp, SendRefundNotification } from './smsPayloads.interface';

export interface ISmsGatewayAdapter {
  sendLoginOtp(payload: SendLoginOtp): Promise<void>;
  sendRefundNotification(payload: SendRefundNotification): Promise<void>;
}

export interface IWhatsappGatewayAdapter {
  sendMessage(payload: CeletelWhatsappGatewayPayload): Promise<void>;
}
