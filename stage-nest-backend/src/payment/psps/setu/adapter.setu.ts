import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import ky, { HTTPError, KyInstance } from 'ky';

import { createHmac, timingSafeEqual } from 'crypto';
import { json } from 'typia';

import axios, { AxiosError } from 'axios';

import { addHours, addSeconds, isBefore } from 'date-fns';

import {
  SetuCreateMandateDto,
  SetuExecuteMandateDto,
  SetuSendPreDebitNotificationDto,
} from './dto/setu.request.dto';
import {
  SetuCreateMandateResponseDto,
  SetuExecuteMandateResponseDto,
  SetuMandateNotificationStatusResponseDto,
  SetuSendPreDebitNotificationResponseDto,
} from './dto/setu.response.dto';
import { SetuWebhookPayloadDto } from './dto/setu.webhook.dto';
import {
  SetuMandateAmountRule,
  SetuMandateCreationMode,
  SetuMandateInitiationMode,
  SetuMandateRecurrenceFrequency,
  SetuMandateRecurrenceFrequencyRule,
} from './enums.setu';
import { setuURLBuilder } from './urlBuilder.setu';
import { SetuWebhookParser } from './webhookParser.setu';
import { CacheManagerService, RedisUtility } from '@app/cache-manager';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { EnvironmentEnum } from '@app/common/enums/common.enums';
import { getDateIST, formatDate } from '@app/common/helpers/dateTime.helper';
import { handleAxiosErrorLog, toPaisa } from '@app/common/utils/helpers';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import {
  ExecuteMandate,
  PaymentProviderAdapter,
  SendPreDebitNotification,
  VerifyPayload,
} from '@app/payment/interfaces/paymentProvider.interface';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';
import { CreateMandate } from 'src/payment/interfaces/createMandate.interface';
import { PaymentApp } from 'src/payment/interfaces/misc.interface';
import { ParsedWebhook } from 'src/payment/interfaces/parseWebhook.interface';

const { PLATFORM: platformConfigs, SETU: setuConfigs } = APP_CONFIGS;
const EVERY_3_MINUTES = '0 */3 * * * *';

@Injectable()
export class SetuGatewayAdapter
  implements PaymentProviderAdapter, OnModuleInit
{
  private apiAccessToken!: string;
  private readonly logger = new Logger(SetuGatewayAdapter.name);

  private setuMerchantServiceHttpClient: KyInstance;

  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    @Inject(SetuWebhookParser)
    private readonly setuWebhookParser: SetuWebhookParser,
    private readonly cacheManager: CacheManagerService,
    private readonly redisUtility: RedisUtility,
    private readonly mandateV2Repository: MandateV2Repository,
  ) {
    this.setuMerchantServiceHttpClient = ky.create({
      hooks: {
        beforeRequest: [
          async (request: Request) => {
            request.headers.set('merchantId', setuConfigs.MERCHANT_ID);
            request.headers.set(
              'Authorization',
              `Bearer ${this.apiAccessToken}`,
            );
          },
        ],
      },
      prefixUrl: setuConfigs.API_URL,
    });
  }

  private async _fetchAccessToken() {
    const [accessToken, error] = await this.errorHandlerService.try<
      { access_token: string },
      AxiosError
    >(async (): Promise<{ access_token: string }> => {
      const response = await axios.post(
        `${setuConfigs.ACCOUNT_SERVICE_URL}/${setuURLBuilder.createLoginEndpoint()}`,
        {
          clientID: setuConfigs.CLIENT_ID,
          grant_type: 'client_credentials',
          secret: setuConfigs.CLIENT_SECRET,
        },
        {
          headers: {
            client: 'bridge',
            merchantId: setuConfigs.MERCHANT_ID,
            mock: 'false',
          },
        },
      );
      return response.data;
    });
    if (!accessToken) {
      const errMsg = 'Setu access token value is undefined';
      this.logger.error({ error: handleAxiosErrorLog(error) }, errMsg);
      throw new Error(errMsg);
    }
    this.logger.debug({ token: accessToken }, 'Setu access token fetched');
    return accessToken;
  }

  private extractSequenceNumber(message: string): {
    pattern: 'already_success' | 'must_be_requirement';
    number: number;
  } {
    // Pattern 1: "mandate pre debit notification for requested sequence number has already succeeded: n"
    const pattern1Match = message.match(/:\s*(\d+)$/);

    // Pattern 2: "sequence number must be n"
    const pattern2Match = message.match(/must be (\d+)/);

    if (pattern1Match) {
      return {
        number: parseInt(pattern1Match[1]),
        pattern: 'already_success',
      };
    } else if (pattern2Match) {
      return {
        number: parseInt(pattern2Match[1]),
        pattern: 'must_be_requirement',
      };
    } else {
      throw new Error(
        "sequence number message doesn't match any known pattern",
      );
    }
  }

  private generatePaymentProcessorIntentLink(
    upiIntentLink: string,
    paymentApp: PaymentApp,
  ) {
    switch (paymentApp) {
      case PaymentApp.GPAY:
        return upiIntentLink.replace('upi://', 'tez://upi/');
      case PaymentApp.PHONEPE:
        return upiIntentLink.replace('upi://', 'phonepe://');
      case PaymentApp.PAYTM:
        return upiIntentLink.replace('upi://', 'paytmmp://');
      case PaymentApp.CRED:
        return upiIntentLink.replace('upi://', 'credpay://upi/');
      default:
        return upiIntentLink;
    }
  }

  private getSetuHeaderConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.apiAccessToken}`,
        'content-type': 'application/json',
        merchantId: setuConfigs.MERCHANT_ID,
        mock: 'false',
      },
    };
  }

  private async handleSequenceNumberMismatch(
    errorMessage: string,
    pgMandateId: string,
  ) {
    const seqData = this.extractSequenceNumber(errorMessage);
    const mandate = await this.mandateV2Repository
      .getEntityManager()
      .fork()
      .findOneOrFail(
        MandateV2,
        { pgMandateId },
        {
          failHandler: () => {
            throw Errors.MANDATE.NOT_FOUND();
          },
        },
      );
    if (seqData.pattern == 'must_be_requirement') {
      mandate.sequenceNumber = seqData.number;
    } else if (seqData.pattern == 'already_success') {
      mandate.sequenceNumber = seqData.number + 1;
    }
    await this.mandateV2Repository
      .getEntityManager()
      .fork()
      .persistAndFlush(mandate);
  }

  async checkMandateNotificationStatus({
    mandateId,
    notificationId,
  }: {
    mandateId: string;
    notificationId: string;
  }) {
    const [mandateNotificationStatusResponse, error] =
      await this.errorHandlerService.try<
        SetuMandateNotificationStatusResponseDto,
        AxiosError
      >(async () => {
        const response = await axios.get(
          `${setuConfigs.API_URL}/${setuURLBuilder.createCheckMandateNotificationStatusEndpoint(
            {
              mandateId,
              notificationId,
            },
          )}`,
          this.getSetuHeaderConfig(),
        );
        return response.data;
      });
    if (error) {
      this.logger.error('Error checking mandate notification status', error);
      throw await error;
    }
    return {
      mandateId: mandateNotificationStatusResponse.mandateId,
      notificationId: mandateNotificationStatusResponse.id,
      status: mandateNotificationStatusResponse.status,
    };
  }

  checkMandateStatus(): void {
    throw new Error('Method not implemented.');
  }

  async createMandate(createMandate: CreateMandate) {
    const mandateMaxAmountLimitInPaisa = toPaisa(createMandate.maxAmountLimit);
    const mandateCreationPriceInPaisa = toPaisa(
      createMandate.mandateCreationPrice,
    );

    const formattedStartDate = formatDate(
      getDateIST(createMandate.startDate),
      'ddmmyyyy',
    );
    const formattedEndDate = formatDate(
      getDateIST(createMandate.endDate),
      'ddmmyyyy',
    );

    const setuCreateMandatePayload: SetuCreateMandateDto = {
      allowMultipleDebit: false,
      amount: mandateMaxAmountLimitInPaisa, //Amount(in paisa) of the mandate
      amountRule: SetuMandateAmountRule.MAX,
      autoExecute: false,
      autoPreNotify: false,
      blockFunds: false,
      creationMode: SetuMandateCreationMode.INTENT,
      currency: createMandate.currency,
      customerRevocable: true,
      endDate: formattedEndDate,
      expireAfter: platformConfigs.INTENT_LINK_EXPIRE_MINS,
      firstExecutionAmount: mandateCreationPriceInPaisa, // TODO: This should come from static config
      frequency: SetuMandateRecurrenceFrequency.AS_PRESENTED,
      initiationMode: SetuMandateInitiationMode.INTENT,
      merchantVpa: setuConfigs.MERCHANT_VPA,
      purpose: '14', // This is constant from NPCI side.
      recurrenceRule: SetuMandateRecurrenceFrequencyRule.ON_DATE,
      recurrenceValue: 0, // because using as presented
      referenceId: createMandate.stageMandateOrderId,
      showFirstExecutionAmountToPayer: true,
      startDate: formattedStartDate,
      transactionNote: 'Stage ott subscription',
    };

    const [mandateResponse, error] = await this.errorHandlerService.try<
      SetuCreateMandateResponseDto,
      HTTPError
    >(() =>
      this.setuMerchantServiceHttpClient
        .post<SetuCreateMandateResponseDto>(
          setuURLBuilder.createMandateEndpoint(),
          {
            json: setuCreateMandatePayload,
          },
        )
        .json(),
    );
    if (error) {
      const errorResponse = await error.response.json();
      this.logger.log(
        { setuCreateMandatePayload },
        'Mandate creation failed payload',
      );
      this.logger.error({ errorResponse }, 'Error creating mandate');
      throw Errors.MANDATE.CREATION_FAILED(JSON.stringify(errorResponse)); // FIXME: don't send complete err object
    }

    this.logger.log(`Mandate created with id: ${mandateResponse.id}`);

    return {
      intentLink: this.generatePaymentProcessorIntentLink(
        mandateResponse.intentLink,
        createMandate.paymentApp,
      ),
      mandateId: mandateResponse.id,
    };
  }

  deductPayment(): void {
    throw new Error('Method not implemented.');
  }

  async executeMandate({
    amount,
    merchantReferenceId,
    pgMandateId,
    remark,
    sequenceNumber,
    umn,
  }: ExecuteMandate) {
    const setuExecuteMandatePayload: SetuExecuteMandateDto = {
      amount: toPaisa(amount),
      referenceId: merchantReferenceId,
      remark,
      sequenceNumber,
      umn,
    };
    const [executeMandateResponse, error] = await this.errorHandlerService.try<
      SetuExecuteMandateResponseDto,
      AxiosError
    >(async () => {
      const response = await axios.post(
        `${setuConfigs.API_URL}/${setuURLBuilder.createExecuteMandateEndpoint(pgMandateId)}`,
        setuExecuteMandatePayload,
        {
          headers: {
            Authorization: `Bearer ${this.apiAccessToken}`,
            'content-type': 'application/json',
            merchantId: setuConfigs.MERCHANT_ID,
            mock: 'false',
          },
        },
      );
      return response.data;
    });
    if (error) {
      this.logger.error(
        { error: handleAxiosErrorLog(error) },
        `Error executing mandate:${pgMandateId}`,
      );
      throw new Error(`Error executing mandate:${pgMandateId}`);
    }
    this.logger.log(
      `Mandate executed for pgMandate:${pgMandateId} with id: ${executeMandateResponse.id}`,
    );
    return {
      id: executeMandateResponse.id,
      status: executeMandateResponse.status,
    };
  }

  generateSignature({ verificationPayload }: { verificationPayload: string }) {
    const hmac = createHmac('sha256', setuConfigs.WEBHOOK_SECRET);
    hmac.update(verificationPayload);
    return hmac.digest('base64');
  }

  initiateRefund(): void {
    throw new Error('Method not implemented.');
  }

  async onModuleInit() {
    await this.errorHandlerService.try(() => this.tokenCheck());
  }

  parseWebhook(webhookPayload: unknown): ParsedWebhook {
    return this.setuWebhookParser.handle(
      webhookPayload as SetuWebhookPayloadDto,
    );
  }

  async refreshAccessToken() {
    const key = 'SETU_TOKEN';
    const now = new Date();

    const cachedData: {
      token: { access_token: string };
      expireTime: Date | string; // Allow for both Date and string types.;
    } | null = await this.cacheManager.get(key);

    if (cachedData) {
      const expireTime =
        cachedData.expireTime instanceof Date
          ? cachedData.expireTime
          : new Date(cachedData.expireTime);

      if (isBefore(now, expireTime)) {
        this.apiAccessToken = cachedData.token.access_token;
        return;
      }
    }

    const token = await this._fetchAccessToken();
    const { TOKEN_EXPIRY_SECS } = APP_CONFIGS.SETU;

    await this.cacheManager.set(
      key,
      {
        expireTime: addSeconds(now, TOKEN_EXPIRY_SECS - 1 * 60 - 10), // 3 Mins - 10 secs for buffer logic
        token,
      },
      TOKEN_EXPIRY_SECS,
    );

    this.apiAccessToken = token.access_token;
  }

  async sendPreDebitNotification({
    amount,
    executionDate,
    merchantReferenceId,
    pgMandateId,
    sequenceNumber,
    umn,
  }: SendPreDebitNotification) {
    const executionBufferTime = addHours(new Date(), 25); // TODO: validate this for all edge-cases
    executionDate = isBefore(executionDate, executionBufferTime)
      ? executionBufferTime
      : executionDate;

    const setuSendPreDebitNotificationPayload: SetuSendPreDebitNotificationDto =
      {
        amount: toPaisa(amount),
        executionDate: formatDate(getDateIST(executionDate), 'ddmmyyyy'),
        referenceId: merchantReferenceId,
        sequenceNumber,
        umn,
      };

    const [preDebitNotificationResponse, error] =
      await this.errorHandlerService.try<
        SetuSendPreDebitNotificationResponseDto,
        AxiosError
      >(async () => {
        const response = await axios.post(
          `${setuConfigs.API_URL}/${setuURLBuilder.createPreDebitNotificationEndpoint(pgMandateId)}`,
          setuSendPreDebitNotificationPayload,
          {
            headers: {
              Authorization: `Bearer ${this.apiAccessToken}`,
              'content-type': 'application/json',
              merchantId: setuConfigs.MERCHANT_ID,
              mock: 'false',
            },
          },
        );
        return response.data;
      });
    if (error) {
      const axiosErrorData = handleAxiosErrorLog(error);
      const errorData = axiosErrorData.response.data;
      if (errorData?.code == 'invalid-sequence-number') {
        const errorMessage = errorData?.detail;
        this.handleSequenceNumberMismatch(errorMessage, pgMandateId);
      }
      this.logger.error(
        { error: axiosErrorData },
        `Error sending pre debit notification:${pgMandateId}`,
      );
      throw new Error(`Error sending pre debit notification:${pgMandateId}`);
    }
    this.logger.log(
      `Pre debit notification sent for pgMandate:${pgMandateId} with id: ${preDebitNotificationResponse.id}`,
    );
    return { notificationId: preDebitNotificationResponse.id };
  }

  @Cron(EVERY_3_MINUTES)
  async tokenCheck() {
    if (APP_CONFIGS.PLATFORM.ENV === EnvironmentEnum.TEST) {
      return;
    }
    return this.redisUtility.executeWithLock('SETU_TOKEN', () =>
      this.refreshAccessToken(),
    );
  }

  verifySignature({ signature, verificationPayload }: VerifyPayload): boolean {
    const transformedPayload = json.stringify(verificationPayload);
    const expectedSignature = this.generateSignature({
      verificationPayload: transformedPayload,
    });

    return timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64'),
    );
  }
}
