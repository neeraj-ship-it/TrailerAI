import { Injectable, Logger } from '@nestjs/common';
import ky from 'ky';
import { json } from 'typia';

import { MetabaseSRHealthResponseDto } from '../dtos/metabaseSubscriptionRate.response.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { DirectIntegrationPGEnum } from '@app/common/enums/common.enums';
import { MandateOrderRepository } from '@app/common/repositories/mandateOrder.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import {
  NotificationKeys,
  NotificationPayload,
} from 'src/notification/interfaces/notificationPayload.interface';
import { NotificationDispatcher } from 'src/notification/services/notificationDispatcher.service';

interface TRAlertResponse {
  isLow: boolean;
  percentage: string;
  pgName: DirectIntegrationPGEnum;
  thresholdPercentage: string;
}

@Injectable()
export class PaymentAlertsService {
  private readonly logger = new Logger(PaymentAlertsService.name);

  constructor(
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly mandateOrderRepository: MandateOrderRepository,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  private async dispatchNotification(data: NotificationPayload) {
    return this.errorHandlerService.try(
      async () => {
        await this.notificationDispatcher.dispatchNotification(data);
        this.logger.debug(
          `Dispatched job with payload ${json.stringify(data)}`,
        );
      },
      (error) => {
        this.logger.error(
          { error },
          `Error registering notification on the queue`,
        );
      },
    );
  }

  // Measure Phonepe/PAYTM PG Trial Rate (New Trial Purchase %)
  private async isDirectIntegrationTrLow(
    pgName: DirectIntegrationPGEnum,
  ): Promise<TRAlertResponse> {
    const now = Date.now();
    const { OBSERVATION_TIME_FRAME, OFFSET_TIME, THRESHOLD } =
      APP_CONFIGS.ALERTS[pgName].TR_CONFIGS;

    const startTime = new Date(
      now - (OBSERVATION_TIME_FRAME + OFFSET_TIME) * 1000,
    );
    const endTime = new Date(now - OFFSET_TIME * 1000);

    const mandateActiveRatio =
      await this.mandateOrderRepository.checkPgTrialSuccessRate({
        endTime,
        pgName,
        startTime,
      });

    return {
      isLow: mandateActiveRatio < THRESHOLD,
      percentage: `${(mandateActiveRatio * 100).toFixed(2)}%`,
      pgName,
      thresholdPercentage: `${THRESHOLD * 100}%`,
    };
  }

  async subscriptionRateHealthCheck(): Promise<boolean> {
    const uri = APP_CONFIGS.METABASE.SUBSCRIPTION_RATE_URL;
    const [response] = await this.errorHandlerService.try(
      () => ky.get<MetabaseSRHealthResponseDto[]>(uri).json(),
      () => {
        const errorMessage = 'Metabase SR Health Report failure';
        this.logger.error({ error: response }, errorMessage);
        return Errors.EXTERNAL_API_ERROR(errorMessage);
      },
    );

    const statusList: MetabaseSRHealthResponseDto[] = response;
    statusList.forEach(async (report) => {
      if (report.alert_flag === 'YES') {
        const {
          payment_gateway,
          subscribed,
          success,
          trial_end_date,
          trial_endings,
        } = report;
        const notificationMsg = `*Gateway:* :credit_card: ${payment_gateway}\n*Subscription Rate:* :warning: ${(Number(success) * 100).toFixed(2)}%\n*Batch Size:* ${subscribed}/${trial_endings}\n *Cohort Trial End Time:* ${trial_end_date}`;

        await this.dispatchNotification({
          key: NotificationKeys.SEND_SR_ALERT_NOTIFICATION,
          payload: { message: notificationMsg },
        });
        this.logger.log(notificationMsg);
      }
    });
    return true;
  }

  async trialRateHealthCheck() {
    const supportedPgs: DirectIntegrationPGEnum[] = [
      DirectIntegrationPGEnum.PHONEPE,
      DirectIntegrationPGEnum.PAYTM,
    ];
    const promises: Promise<TRAlertResponse>[] = [];
    supportedPgs.forEach((pg) => {
      promises.push(this.isDirectIntegrationTrLow(pg));
    });
    const results = await Promise.all(promises);

    for (let i = 0; i < supportedPgs.length; i += 1) {
      const { isLow, percentage, pgName, thresholdPercentage } = results[i];

      if (isLow) {
        const notificationMsg = `*Gateway:* :credit_card: ${pgName}\n*Trial Rate:* :warning: ${percentage}\n*Threshold:* ${thresholdPercentage}`;
        // const notificationMsg = `${pgName} trial rate is lower than threshold(${thresholdPercentage}), currently at ${percentage}`;
        await this.dispatchNotification({
          key: NotificationKeys.SEND_TR_ALERT_NOTIFICATION,
          payload: { message: notificationMsg },
        });
        this.logger.log(notificationMsg);
      }
    }
  }
}
