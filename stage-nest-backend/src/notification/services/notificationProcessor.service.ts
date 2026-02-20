import { Injectable, Logger } from '@nestjs/common';

import { SmsAdapter } from '../adapters/sms.adapter';
import { WhatsappAdapter } from '../adapters/whatsapp.adapter';
import { SlackGateway } from '../gateways/slack.gateway';
import {
  SMS_GATEWAY_PROVIDERS,
  WHATSAPP_GATEWAY_PROVIDERS,
} from '../interfaces/notificationGateway.interface';
import {
  NotificationKeys,
  NotificationPayload,
  SendCmsAssetMonitoringNotificationPayload,
  SendRefundNotificationPayload,
  SendSRAlertPayload,
  SendSubscriptionSuccessNotificationPayload,
  SendTRAlertPayload,
  SendTrialActivatedNotificationPayload,
  SendTrialConversionNotificationPayload,
  SendTrialFailNotificationPayload,
} from '../interfaces/notificationPayload.interface';
import { SendCronTriggerNotification } from '../interfaces/slackPayloads.interface';
import { SendLoginOtp } from '../interfaces/smsPayloads.interface';
import { NotificationRecipientService } from './notificationRecipient.service';

@Injectable()
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);
  constructor(
    private readonly smsAdapter: SmsAdapter,
    private readonly whatsappAdapter: WhatsappAdapter,
    private readonly slackGateway: SlackGateway,
    private readonly notificationRecipientService: NotificationRecipientService,
  ) {}

  private sendCmsAssetMonitoringNotification(
    payload: SendCmsAssetMonitoringNotificationPayload,
  ) {
    return this.slackGateway.sendCmsAssetMonitoringNotification(payload);
  }

  private sendCronTriggerNotification(payload: SendCronTriggerNotification) {
    return this.slackGateway.sendCronTriggerNotification(payload);
  }

  private sendLoginOTP(payload: SendLoginOtp) {
    return this.smsAdapter.sendLoginOtp(SMS_GATEWAY_PROVIDERS.GUPSHUP, payload);
  }

  private async sendRefundNotification(data: SendRefundNotificationPayload) {
    const phoneNumber =
      await this.notificationRecipientService.getPhoneNumberFromUserId(
        data.payload.recipient,
      );
    return this.smsAdapter.sendRefundNotification(
      SMS_GATEWAY_PROVIDERS.GUPSHUP,
      {
        phoneNumber,
      },
    );
  }
  private sendSRAlertNotification(payload: SendSRAlertPayload) {
    return this.slackGateway.sendSRAlertNotification(payload);
  }
  private async sendSubscriptionSuccessNotification(
    data: SendSubscriptionSuccessNotificationPayload,
  ) {
    const phoneNumber =
      await this.notificationRecipientService.getPhoneNumberFromUserId(
        data.payload.recipient,
      );

    return this.whatsappAdapter.sendSubscriptionSuccessNotification(
      WHATSAPP_GATEWAY_PROVIDERS.CELETEL,
      { ...data.payload, phoneNumber },
    );
  }

  private sendTRAlertNotification(payload: SendTRAlertPayload) {
    return this.slackGateway.sendTRAlertNotification(payload);
  }

  private async sendTrialActivatedNotification(
    data: SendTrialActivatedNotificationPayload,
  ) {
    const phoneNumber =
      await this.notificationRecipientService.getPhoneNumberFromUserId(
        data.payload.recipient,
      );

    return this.whatsappAdapter.sendTrialActivatedNotification(
      WHATSAPP_GATEWAY_PROVIDERS.CELETEL,
      { ...data.payload, phoneNumber },
    );
  }
  private async sendTrialConversionNotification(
    data: SendTrialConversionNotificationPayload,
  ) {
    const phoneNumber =
      await this.notificationRecipientService.getPhoneNumberFromUserId(
        data.payload.recipient,
      );

    return this.whatsappAdapter.sendTrialConversionNotification(
      WHATSAPP_GATEWAY_PROVIDERS.CELETEL,
      { ...data.payload, phoneNumber },
    );
  }
  private async sendTrialFailNotification(
    data: SendTrialFailNotificationPayload,
  ) {
    const phoneNumber =
      await this.notificationRecipientService.getPhoneNumberFromUserId(
        data.payload.recipient,
      );

    return this.whatsappAdapter.sendTrialFailNotification(
      WHATSAPP_GATEWAY_PROVIDERS.CELETEL,
      { ...data.payload, phoneNumber },
    );
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const { key, payload: notificationPayload } = payload;
    switch (key) {
      case NotificationKeys.SEND_LOGIN_OTP:
        return this.sendLoginOTP(notificationPayload);
      case NotificationKeys.SEND_REFUND_TRIGGER_NOTIFICATION:
        return this.sendRefundNotification(payload);
      case NotificationKeys.SEND_CRON_TRIGGER_NOTIFICATION:
        return this.sendCronTriggerNotification(notificationPayload);
      case NotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION:
        return this.sendTrialActivatedNotification(payload);
      case NotificationKeys.SEND_TRIAL_CONVERSION_NOTIFICATION:
        return this.sendTrialConversionNotification(payload);
      case NotificationKeys.SEND_TRIAL_FAIL_NOTIFICATION:
        return this.sendTrialFailNotification(payload);
      case NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION:
        return this.sendSubscriptionSuccessNotification(payload);
      case NotificationKeys.SEND_SR_ALERT_NOTIFICATION:
        return this.sendSRAlertNotification(payload);
      case NotificationKeys.SEND_CMS_ASSET_MONITORING_NOTIFICATION:
        return this.sendCmsAssetMonitoringNotification(payload);
      case NotificationKeys.SEND_TR_ALERT_NOTIFICATION:
        return this.sendTRAlertNotification(payload);
      default:
        this.logger.error(`Unknown notification key ${key}`);
    }
  }
}
