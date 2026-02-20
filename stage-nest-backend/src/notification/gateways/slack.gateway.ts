import { Injectable } from '@nestjs/common';

import { LogLevel, WebClient } from '@slack/web-api';

import {
  NotificationKeys,
  SendCmsAssetMonitoringNotificationPayload,
  SendSRAlertPayload,
  SendTRAlertPayload,
} from '../interfaces/notificationPayload.interface';
import { SendCronTriggerNotification } from '../interfaces/slackPayloads.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class SlackGateway {
  private channelMap: Partial<Record<NotificationKeys, string>> = {
    [NotificationKeys.SEND_CMS_ASSET_MONITORING_NOTIFICATION]: '#cms-alerts',
    [NotificationKeys.SEND_SR_ALERT_NOTIFICATION]: '#product-alerts',
    [NotificationKeys.SEND_TR_ALERT_NOTIFICATION]: '#product-alerts',
  };

  private readonly slackClient: WebClient;

  constructor() {
    this.slackClient = new WebClient(APP_CONFIGS.SLACK.BOT_TOKEN, {
      logLevel: APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? LogLevel.INFO
        : LogLevel.DEBUG,
    });
  }

  private getSlackChannel(key: NotificationKeys) {
    const testChannel = '#notification-test';
    if (!APP_CONFIGS.PLATFORM.IS_PRODUCTION) {
      return testChannel;
    }

    return this.channelMap[key] ?? testChannel;
  }

  async sendCmsAssetMonitoringNotification(
    data: SendCmsAssetMonitoringNotificationPayload,
  ) {
    const { key, payload } = data;
    await this.slackClient.chat.postMessage({
      blocks: [
        {
          text: {
            emoji: true,
            text: ':bar_chart: CMS Asset Monitoring',
            type: 'plain_text',
          },
          type: 'header',
        },
        {
          type: 'divider',
        },
        {
          text: {
            text: payload.message,
            type: 'mrkdwn',
          },
          type: 'section',
        },
      ],
      channel: this.getSlackChannel(key),
    });
  }

  async sendCronTriggerNotification(payload: SendCronTriggerNotification) {
    await this.slackClient.chat.postMessage({
      channel: '#notification-test',
      text: `Cron ${payload.cronName} triggered at ${payload.triggerTime}`,
    });
  }

  async sendSRAlertNotification(data: SendSRAlertPayload) {
    const { key, payload } = data;
    await this.slackClient.chat.postMessage({
      blocks: [
        {
          text: {
            emoji: true,
            text: ':bar_chart: Subscription Rate Alerts',
            type: 'plain_text',
          },
          type: 'header',
        },
        {
          type: 'divider',
        },
        {
          text: {
            text: payload.message,
            type: 'mrkdwn',
          },
          type: 'section',
        },
      ],
      channel: this.getSlackChannel(key),
    });
  }

  async sendTRAlertNotification(data: SendTRAlertPayload) {
    const { key, payload } = data;
    await this.slackClient.chat.postMessage({
      blocks: [
        {
          text: {
            emoji: true,
            text: ':bar_chart: Trial Rate Alerts',
            type: 'plain_text',
          },
          type: 'header',
        },
        {
          type: 'divider',
        },
        {
          text: {
            text: payload.message,
            type: 'mrkdwn',
          },
          type: 'section',
        },
      ],
      channel: this.getSlackChannel(key),
    });
  }
}
