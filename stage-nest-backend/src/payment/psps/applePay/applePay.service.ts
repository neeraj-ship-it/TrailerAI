import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  AppStoreServerAPIClient,
  Environment,
  NotificationTypeV2,
  PromotionalOfferSignatureCreator,
  ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  Subtype,
} from '@apple/app-store-server-library';

import { validate } from 'typia';

import { randomUUID } from 'node:crypto';

import { Reference, Transactional } from '@mikro-orm/mongodb';
import { Types } from 'mongoose';

import { isBefore } from 'date-fns';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import axios from 'axios';

import { ContextUser } from '@app/auth';
import { QUEUES } from '@app/common/constants/queues.const';
import { StringConstants } from '@app/common/constants/string.constant';
import {
  ClientAppIdEnum,
  CurrencyEnum,
  CurrencySymbolEnum,
  Dialect,
  OS,
  Platform,
} from '@app/common/enums/app.enum';
import {
  MasterMandateStatusEnum,
  RevokeTrigger,
} from '@app/common/enums/common.enums';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import { PlanV2Repository } from '@app/common/repositories/planV2.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import {
  convertMilliCurrencyUnit,
  stringToEnum,
} from '@app/common/utils/helpers';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events/events.service';
import { ActionSource, Events } from '@app/events/interfaces/events.interface';
import { CreatePaymentSessionResponseDTO } from '@app/payment/dtos/requests/applePay.request.dto';
import { WebhookPayload } from '@app/payment/entities/webhookPayload.entity';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { PlanCountryEnum, PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { type ApplePayTransactionPayload } from '@app/payment/interfaces/applePay.interface';
import { ApplePayTransactionsRepository } from '@app/payment/repositories/applePayTransactions.repository';
import { WebhookPayloadRepository } from '@app/payment/repositories/webhookPayload.repository';
import { UserSubscriptionStatusV2 } from '@app/shared/entities/userSubscriptionV2.entity';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';
import { UserSubscriptionV1Service } from '@app/shared/services/userSubscriptionV1.service';
import { UserSubscriptionV2Service } from '@app/shared/services/userSubscriptionV2.service';
import { APP_CONFIGS, LEGACY_APP_BASE_URL } from 'common/configs/app.config';
import { NotificationKeys } from 'src/notification/interfaces/notificationPayload.interface';
import { NotificationDispatcher } from 'src/notification/services/notificationDispatcher.service';

enum AppleOfferType {
  INTRODUCTORY = 'INTRODUCTORY',
  NONE = 'NONE',
  PROMOTIONAL = 'PROMOTIONAL',
}

@Injectable()
export class ApplePayService {
  private readonly applePayClient: AppStoreServerAPIClient;
  private readonly secretKeyId = APP_CONFIGS.APPLE_PAY.keyId;
  private readonly encodedPrivateKey = readFileSync(
    resolve(__dirname, `cert/SubscriptionKey_${this.secretKeyId}.p8`),
    'utf-8',
  );
  private readonly environment = APP_CONFIGS.PLATFORM.IS_PRODUCTION
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

  private readonly logger = new Logger(ApplePayService.name);

  private readonly rootCertificates = [
    resolve(__dirname, 'cert/AppleIncRootCertificate.cer'),
    resolve(__dirname, 'cert/AppleRootCA-G2.cer'),
    resolve(__dirname, 'cert/AppleRootCA-G3.cer'),
  ];
  private readonly verifier: SignedDataVerifier;

  constructor(
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly userRepository: UserRepository,
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly userSubscriptionV2Service: UserSubscriptionV2Service,
    private readonly applePayTransactionsRepository: ApplePayTransactionsRepository,
    private readonly planV2Repository: PlanV2Repository,
    private readonly webhookPayloadRepository: WebhookPayloadRepository,
    private readonly eventService: EventService,
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly userSubscriptionV1Service: UserSubscriptionV1Service,
    @InjectQueue(QUEUES.SUBSCRIPTION_CHECK)
    private readonly subscriptionCheckQueue: Queue<
      QueuePayload[QUEUES.SUBSCRIPTION_CHECK]
    >,
  ) {
    const { appStoreConnectApiPrivateKeyId, bundleId, issuerId, keyId } =
      APP_CONFIGS.APPLE_PAY;
    const rootCertificates = this.rootCertificates.map((path) =>
      readFileSync(path),
    );

    this.applePayClient = new AppStoreServerAPIClient(
      this.encodedPrivateKey,
      keyId,
      issuerId,
      bundleId,
      this.environment,
    );
    this.verifier = new SignedDataVerifier(
      rootCertificates,
      true,
      this.environment,
      bundleId,
      appStoreConnectApiPrivateKeyId,
    );
  }

  private findUserByAppleSubscriptionId(iosUserId: string) {
    return this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findOne({
        iosUserId,
      }),
      Errors.USER.USER_NOT_FOUND(
        `Could not find user for iosUserId:${iosUserId}`,
      ),
    );
  }

  private async validateTransactionData(
    signedTransactionInfo?: string,
  ): Promise<ApplePayTransactionPayload> {
    if (!signedTransactionInfo) {
      throw new Error('Signed transaction info is missing');
    }
    const decodedTransactionData =
      await this.verifier.verifyAndDecodeTransaction(signedTransactionInfo);

    console.log('transactionData', decodedTransactionData);

    const { data: transactionData, success } =
      validate<ApplePayTransactionPayload>(decodedTransactionData);

    if (!success) {
      throw new Error('Apple Pay transaction data validation failed');
    }

    return transactionData;
  }

  async cancelLastActiveMandate(userId: string) {
    const userSubscriptionHistory =
      await this.userSubscriptionHistoryRepository.findOne(
        {
          userId,
        },
        [
          '_id',
          'vendor',
          'order',
          'planId',
          'masterMandateId',
          'juspayOrderId',
          'platform',
        ],
        {
          sort: { createdAt: -1 },
        },
      );
    if (!userSubscriptionHistory) return;
    const { masterMandateId, order, planId, platform, vendor } =
      userSubscriptionHistory;
    let docId = '';
    switch (vendor) {
      case PaymentGatewayEnum.PHONEPE:
      case PaymentGatewayEnum.PAYTM: {
        if (!masterMandateId) {
          this.logger.error(`masterMandateId not present for ${userId}`);
          return;
        }
        docId = masterMandateId?._id.toString();
        break;
      }
      case PaymentGatewayEnum.JUSPAY:
      case PaymentGatewayEnum.JUSPAY_CHECKOUT: {
        if (!order) {
          this.logger.error(`juspayOrderId not present for ${userId}`);
          return;
        }
        docId = order._id.toString();
        break;
      }
      case PaymentGatewayEnum.APPLE_PAY:
      case PaymentGatewayEnum.LEGACY_APPLE:
      case PaymentGatewayEnum.RAZORPAY: {
        // FIXME: handle for razorpay
        break;
      }
      case PaymentGatewayEnum.SETU: {
        // FIXME: handle for setu
      }
    }
    this.userSubscriptionV1Service.revokeMandate(
      vendor,
      userId,
      docId,
      RevokeTrigger.NEW_AUTOPAY,
      stringToEnum(Platform, platform) ?? Platform.APP,
      planId,
    );
  }

  async decodeTransactions(payload: ResponseBodyV2DecodedPayload): Promise<{
    transactionData: ApplePayTransactionPayload;
    rawPayload?: WebhookPayload;
  }> {
    const { data, notificationType, subtype } = payload;

    const [transactionData, error] = await this.errorHandlerService.try(
      async () => {
        if (!data?.signedTransactionInfo) {
          throw new Error('Signed transaction info is missing');
        }

        return this.validateTransactionData(data.signedTransactionInfo);
      },
    );

    if (error) {
      this.logger.error(
        error,
        'Failed to process subscription creation notification',
      );
      throw error;
    }

    if (!transactionData) {
      throw new Error('Transaction data is missing');
    }

    if (transactionData.appAccountToken) {
      const operation =
        (notificationType ?? 'subscribed') + '.' + (subtype ?? 'notification');

      const rawPayload = await this.webhookPayloadRepository.create({
        operation,
        pg: PaymentGatewayEnum.APPLE_PAY,
        rawPayload: data,
      });
      await this.webhookPayloadRepository.save(rawPayload);
      return { rawPayload, transactionData };
    }
    return { transactionData };
  }

  generatePromotionalOfferSignature({
    appAccountToken,
    nonce,
    offerId,
    productId,
    timestamp,
  }: {
    productId: string;
    appAccountToken: string;
    timestamp: number;
    nonce: string;
    offerId: string;
  }): {
    nonce: string;
    timestamp: number;
    signature: string;
    identifier: string;
    productId: string;
    keyIdentifier: string;
  } {
    const signatureCreator = new PromotionalOfferSignatureCreator(
      this.encodedPrivateKey,
      this.secretKeyId,
      APP_CONFIGS.APPLE_PAY.bundleId,
    );

    const signature = signatureCreator.createSignature(
      productId,
      offerId,
      appAccountToken,
      nonce,
      timestamp,
    );

    return {
      identifier: offerId,
      keyIdentifier: this.secretKeyId,
      nonce,
      productId,
      signature,
      timestamp,
    };
  }

  async handleApplePayWebhook({ signedPayload }: { signedPayload: string }) {
    const transaction =
      await this.verifier.verifyAndDecodeNotification(signedPayload);

    const { notificationType, subtype } = transaction;

    const { rawPayload, transactionData } =
      await this.decodeTransactions(transaction);

    if (
      transactionData.appAccountToken == undefined ||
      rawPayload == undefined
    ) {
      return this.handleOldInfraWebhook({ signedPayload }); // old infra webhooks don't have appAccountToken
    }

    const operation =
      (notificationType ?? StringConstants.undefinedText) +
      '.' +
      (subtype ?? StringConstants.undefinedText);
    this.logger.log(`Received apple pay webhook:${operation}`);

    // commented few types so that can be used when needed, not in use at the moment
    switch (transaction.notificationType) {
      case NotificationTypeV2.SUBSCRIBED:
        return this.handleSubscribed(transactionData, rawPayload);
      case NotificationTypeV2.EXPIRED:
        return this.handleSubscriptionExpired(transactionData);
      case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
        return this.handleSubscriptionRenewalStatusChanged(
          transactionData,
          subtype,
        );
      case NotificationTypeV2.DID_FAIL_TO_RENEW:
        return this.handleSubscriptionFailedToRenew(transaction);
      case NotificationTypeV2.REFUND:
        return this.handleRefund(transaction);
      // case NotificationTypeV2.TEST:
      //   return true;
      // return this.handleTest(transaction);
      case NotificationTypeV2.DID_RENEW:
        return this.handleDidRenew(transactionData, rawPayload);
      // case NotificationTypeV2.PRICE_INCREASE:
      //   return this.handlePriceIncrease(transaction);
      // case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
      //   return this.handleGracePeriodExpired(transaction);
      case NotificationTypeV2.OFFER_REDEEMED:
        return this.handleOfferRedeemed(transaction);
      // case NotificationTypeV2.CONSUMPTION_REQUEST: // for refund
      //   return this.handleConsumptionRequest(transaction);
      // case NotificationTypeV2.RENEWAL_EXTENDED:
      //   return this.handleRenewalExtended(transaction);
      default:
        this.logger.warn(
          `Unhandled apple notification type: ${transaction.notificationType}`,
        );
        // TODO: save payload
        return true;
    }
  }

  /**
   * Handle consumption request
   */
  async handleConsumptionRequest(payload: ResponseBodyV2DecodedPayload) {
    const { data } = payload;
    const [transactionData, error] = await this.errorHandlerService.try(
      async () => {
        const transactionData = await this.validateTransactionData(
          data?.signedTransactionInfo,
        );

        const {
          appAccountToken,
          originalTransactionId,
          productId,
          transactionId,
        } = transactionData;

        this.logger.log(
          {
            appAccountToken,
            notificationType: 'CONSUMPTION_REQUEST',
            originalTransactionId,
            productId,
            transactionId,
          },
          'Consumption request notification received',
        );

        return transactionData;
      },
    );

    if (error) {
      this.logger.error(
        error,
        'Failed to process consumption request notification',
      );
      throw error;
    }

    return transactionData;
  }

  /**
   * Handle subscription renewal event
   */
  @Transactional()
  async handleDidRenew(
    transactionData: ApplePayTransactionPayload,
    rawPayload: WebhookPayload,
  ) {
    const {
      appAccountToken = '',
      currency,
      expiresDate,
      originalTransactionId,
      price,
      productId,
      purchaseDate,
      transactionId,
    } = transactionData;

    const globalPayment = currency != CurrencyEnum.INR;

    this.logger.log(
      {
        transactionData,
      },
      'Subscription renewal webhook received',
    );

    // Store the renewal transaction
    const user = await this.findUserByAppleSubscriptionId(appAccountToken);

    const applePayTransaction = this.applePayTransactionsRepository.create({
      appAccountToken,
      expiresDate: expiresDate ? new Date(expiresDate) : undefined,
      originalTransactionId: originalTransactionId ?? '',
      pgTxnId: transactionId ?? '',
      productId: productId ?? '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      rawPayload: Reference.create(rawPayload),
      txnAmount: convertMilliCurrencyUnit(price ?? 0),
      txnCurrency: currency ?? '',
      userId: user._id.toString(),
    });

    await this.webhookPayloadRepository.save(rawPayload);
    await this.applePayTransactionsRepository.save(applePayTransaction);

    // Update the user subscription if it exists
    const userSubscription =
      await this.userSubscriptionV2Repository.findOneOrFail(
        {
          userId: user._id.toString(),
        },
        {
          failHandler: () =>
            Errors.SUBSCRIPTION.NOT_FOUND(
              `Subscription not found for user:${user._id.toString()}`,
            ),
        },
      );

    const subscriptionEndDate = expiresDate
      ? new Date(expiresDate)
      : new Date();

    userSubscription.endAt = subscriptionEndDate;
    userSubscription.status = UserSubscriptionStatusV2.ACTIVE;
    userSubscription.lastTxn = applePayTransaction._id;

    await this.userSubscriptionV2Repository
      .getEntityManager()
      .persistAndFlush(userSubscription);

    const plan = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.planV2Repository.findOne({
        $or: [{ derivedFrom: productId }, { name: productId }],
        country: globalPayment ? PlanCountryEnum.GLOBAL : PlanCountryEnum.IN,
      }),
      Errors.PLAN.NOT_FOUND(`Could not find apple plan`),
    );

    Promise.all([
      this.subscriptionCheckQueue.remove(userSubscription._id.toString()), // remove subscription removal task if still active
      await this.userSubscriptionV1Service.backfillUserSubscription({
        actualPlanPrice: applePayTransaction.txnAmount,
        actualPrice: applePayTransaction.txnAmount,
        country: plan.country,
        currency: currency ?? '',
        currencySymbol:
          currency == CurrencyEnum.INR
            ? CurrencySymbolEnum.INR
            : CurrencySymbolEnum.USD,
        dialect: user.userCulture ?? Dialect.HAR,
        discount: 0,
        isGlobal: globalPayment,
        isTnplUser: true,
        isUpgrade: false,
        itemId: plan.name,
        os: OS.IOS,
        payingPrice: applePayTransaction.txnAmount,
        paymentGateway: PaymentGatewayEnum.APPLE_PAY,
        planDays: plan.validity.frequency.toString(),
        planId: plan.name,
        planType: plan.validity.planType,
        platform: Platform.APP,
        remarks: [],
        saved: 0,
        status: UserSubscriptionStatusV2.ACTIVE,
        subscriptionDate: new Date(),
        subscriptionId: applePayTransaction._id.toString(),
        subscriptionThrough: 'WEBHOOK',
        subscriptionValid: userSubscription.endAt,
        userId: user._id.toString(),
        vendor: PaymentGatewayEnum.APPLE_PAY,
      }),
    ]);
    // send subscription success notification
    this.notificationDispatcher.dispatchNotification({
      key: NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION,
      payload: {
        dialect: user.userCulture ?? Dialect.HAR,
        recipient: user._id.toString(),
      },
    });
    this.eventService.trackEvent({
      app_client_id: ClientAppIdEnum.IOS_MAIN,
      key: Events.PAYMENT_SUCCESSFUL,
      os: OS.IOS,
      payload: {
        pg_name: PaymentGatewayEnum.APPLE_PAY,
        plan_id: plan.name,
        txn_id: applePayTransaction._id.toString(),
      },
      user_id: user._id.toString(),
    });

    const isRenewed =
      (await this.userSubscriptionHistoryRepository.findCount(
        {
          payingPrice: { $gt: 1 },
          userId: user._id.toString(),
        },
        { sort: { _id: -1 } },
      )) > 1;

    if (!isRenewed) {
      this.eventService.trackEvent({
        app_client_id: ClientAppIdEnum.IOS_MAIN,
        key: Events.SUBSCRIPTION_ACTIVATED,
        os: OS.IOS,
        payload: {
          plan_id: plan.name,
          subscription_id: userSubscription._id.toString(),
          txn_id: applePayTransaction._id.toString(),
        },
        user_id: user._id.toString(),
      });
    } else {
      this.eventService.trackEvent({
        app_client_id: ClientAppIdEnum.IOS_MAIN,
        key: Events.SUBSCRIPTION_RENEWED,
        os: OS.IOS,
        payload: {
          plan_id: plan.name,
          subscription_id: userSubscription._id.toString(),
        },
        user_id: user._id.toString(),
      });
    }

    return transactionData;
  }

  // commented so that can be used when needed
  /**
   * Handle grace period expiration
   */
  // async handleGracePeriodExpired(payload: ResponseBodyV2DecodedPayload) {
  //   const { data } = payload;
  //   const [transactionData, error] = await this.errorHandlerService.try(
  //     async () => {
  //       const transactionData = await this.validateTransactionData(
  //         data?.signedTransactionInfo,
  //       );

  //       const {
  //         appAccountToken,
  //         expiresDate,
  //         originalTransactionId,
  //         transactionId,
  //       } = transactionData;

  //       this.logger.log(
  //         {
  //           appAccountToken,
  //           expiresDate,
  //           notificationType: 'GRACE_PERIOD_EXPIRED',
  //           originalTransactionId,
  //           transactionId,
  //         },
  //         'Grace period expired notification received',
  //       );

  //       return transactionData;
  //     },
  //   );

  //   if (error) {
  //     this.logger.error(
  //       error,
  //       'Failed to process grace period expired notification',
  //     );
  //     throw error;
  //   }

  //   return transactionData;
  // }

  /**
   * Handle offer redemption
   */
  async handleOfferRedeemed(payload: ResponseBodyV2DecodedPayload) {
    const { data } = payload;
    const [transactionData, error] = await this.errorHandlerService.try(
      async () => {
        const transactionData = await this.validateTransactionData(
          data?.signedTransactionInfo,
        );

        const {
          appAccountToken,
          currency,
          offerIdentifier,
          offerType,
          originalTransactionId,
          price,
          transactionId,
        } = transactionData;

        this.logger.log(
          {
            appAccountToken,
            currency,
            notificationType: 'OFFER_REDEEMED',
            offerIdentifier,
            offerType,
            originalTransactionId,
            price,
            transactionId,
          },
          'Offer redeemed notification received',
        );

        return transactionData;
      },
    );

    if (error) {
      this.logger.error(error, 'Failed to process offer redeemed notification');
      throw error;
    }

    return transactionData;
  }

  async handleOldInfraWebhook({ signedPayload }: { signedPayload: string }) {
    const url = `${LEGACY_APP_BASE_URL}/v13/subscription/appStoreNotifications`;
    return axios.post(url, { signedPayload });
  }

  // commented so that can be used when needed
  /**
   * Handle price increase notification
   */
  // async handlePriceIncrease(payload: ResponseBodyV2DecodedPayload) {
  //   const { data } = payload;
  //   const [result, error] = await this.errorHandlerService.try(async () => {
  //     const transactionData = await this.validateTransactionData(
  //       data?.signedTransactionInfo,
  //     );

  //     const {
  //       appAccountToken,
  //       currency,
  //       offerIdentifier,
  //       originalTransactionId,
  //       price,
  //       transactionId,
  //     } = transactionData;

  //     // Price increase notifications may include additional data in the renewalInfo
  //     const renewalInfo = data?.signedRenewalInfo
  //       ? await this.verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
  //       : null;

  //     this.logger.log(
  //       {
  //         appAccountToken,
  //         currency,
  //         notificationType: 'PRICE_INCREASE',
  //         offerIdentifier,
  //         originalTransactionId,
  //         price,
  //         renewalInfo,
  //         transactionId,
  //       },
  //       'Price increase notification received',
  //     );

  //     return {
  //       renewalInfo,
  //       transactionData,
  //     };
  //   });

  //   if (error) {
  //     this.logger.error(error, 'Failed to process price increase notification');
  //     throw error;
  //   }

  //   return result;
  // }

  /**
   * Handle refund event
   */
  async handleRefund(payload: ResponseBodyV2DecodedPayload) {
    const { data } = payload;
    const [transactionData, error] = await this.errorHandlerService.try(
      async () => {
        const transactionData = await this.validateTransactionData(
          data?.signedTransactionInfo,
        );

        const {
          appAccountToken,
          originalTransactionId,
          revocationDate,
          revocationReason,
          transactionId,
        } = transactionData;

        this.logger.log(
          {
            appAccountToken,
            notificationType: 'REFUND',
            originalTransactionId,
            revocationDate,
            revocationReason,
            transactionId,
          },
          'Refund webhook received',
        );

        return transactionData;
      },
    );

    if (error) {
      this.logger.error(error, 'Failed to process refund notification');
      throw error;
    }

    return transactionData;
  }

  // commented so that can be used when needed
  /**
   * Handle renewal extension
   */
  // async handleRenewalExtended(payload: ResponseBodyV2DecodedPayload) {
  //   const { data } = payload;
  //   const [result, error] = await this.errorHandlerService.try(async () => {
  //     const transactionData = await this.validateTransactionData(
  //       data?.signedTransactionInfo,
  //     );

  //     const {
  //       appAccountToken,
  //       expiresDate,
  //       offerIdentifier,
  //       originalTransactionId,
  //       transactionId,
  //     } = transactionData;

  //     // Renewal extension may include additional renewal info
  //     const renewalInfo = data?.signedRenewalInfo
  //       ? await this.verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
  //       : null;

  //     this.logger.log(
  //       {
  //         appAccountToken,
  //         expiresDate,
  //         notificationType: 'RENEWAL_EXTENDED',
  //         offerIdentifier,
  //         originalTransactionId,
  //         renewalInfo,
  //         transactionId,
  //       },
  //       'Renewal extended notification received',
  //     );

  //     return {
  //       renewalInfo,
  //       transactionData,
  //     };
  //   });

  //   if (error) {
  //     this.logger.error(
  //       error,
  //       'Failed to process renewal extended notification',
  //     );
  //     throw error;
  //   }

  //   return result;
  // }

  /**
   * Handle subscription created event
   */
  @Transactional()
  async handleSubscribed(
    transactionData: ApplePayTransactionPayload,
    rawPayload: WebhookPayload,
  ) {
    const {
      appAccountToken = '', // will never be empty as checking in the passing function
      currency,
      expiresDate,
      originalTransactionId,
      price,
      productId,
      purchaseDate,
    } = transactionData;

    const globalPayment = currency != CurrencyEnum.INR;

    this.logger.log(
      {
        transactionData,
      },
      'Subscription created webhook received',
    );

    const user = await this.findUserByAppleSubscriptionId(appAccountToken);

    this.cancelLastActiveMandate(user._id.toString()); // do not await for revoke
    const userSubscription = await this.userSubscriptionV2Repository.findOne({
      userId: user._id.toString(),
    });

    const plan = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.planV2Repository.findOne({
        $or: [{ derivedFrom: productId }, { name: productId }],
        country: globalPayment ? PlanCountryEnum.GLOBAL : PlanCountryEnum.IN,
      }),
      Errors.PLAN.NOT_FOUND(`Could not find apple plan`),
    );

    // Store the complete receipt data
    const applePayTransaction = this.applePayTransactionsRepository.create({
      appAccountToken,
      expiresDate: expiresDate ? new Date(expiresDate) : undefined,
      originalTransactionId: originalTransactionId,
      pgTxnId: originalTransactionId ?? '',
      productId: productId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      rawPayload: Reference.create(rawPayload),
      txnAmount: convertMilliCurrencyUnit(price ?? 0), // convert milli unit to actual price
      txnCurrency: currency ?? StringConstants.undefinedText,
      userId: user._id.toString(),
    });

    const isTrial = applePayTransaction.txnAmount == 0;

    await this.applePayTransactionsRepository.save(applePayTransaction);

    const subscriptionEndDate = expiresDate
      ? new Date(expiresDate)
      : new Date();
    if (!userSubscription) {
      const newUserSubscription =
        await this.userSubscriptionV2Service.createSubscriptionThroughApplePay({
          plan,
          rawTxnData: transactionData,
          subscriptionEndDate,
          subscriptionThrough: 'WEBHOOK',
          trialEndDate: subscriptionEndDate,
          txn: applePayTransaction,
          user: user,
        });

      if (isTrial) {
        this.eventService.trackEvent({
          app_client_id: ClientAppIdEnum.IOS_MAIN,
          key: Events.TRIAL_ACTIVATED,
          os: OS.IOS,
          payload: {
            dialect: user.primaryLanguage,
            mandate_id: null,
            pgName: PaymentGatewayEnum.APPLE_PAY,
            plan_id: productId ?? plan.trialPlanId,
            platform: Platform.APP,
            sequence_number: 1,
            status: MasterMandateStatusEnum.MANDATE_ACTIVE,
            txn_id: applePayTransaction.pgTxnId,
          },
          user_id: user._id.toString(),
        });
        this.notificationDispatcher.dispatchNotification({
          key: NotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION,
          payload: {
            dialect: user.userCulture ?? Dialect.HAR,
            postTrialMonths: plan.validity.frequency / 30, // devide by 30 to convert in months
            postTrialPrice: plan.pricing.netAmount,
            recipient: user._id.toString(),
            trialDays: plan.validity.trialDays,
          },
        });
      } else {
        this.eventService.trackEvent({
          app_client_id: ClientAppIdEnum.IOS_MAIN,
          key: Events.SUBSCRIPTION_ACTIVATED,
          os: OS.IOS,
          payload: {
            plan_id: productId ?? plan.name,
            subscription_id: newUserSubscription.id,
            txn_id: applePayTransaction.pgTxnId,
          },
          user_id: user._id.toString(),
        });
        // send subscription success notification
        this.notificationDispatcher.dispatchNotification({
          key: NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION,
          payload: {
            dialect: user.userCulture ?? Dialect.HAR,
            recipient: user._id.toString(),
          },
        });
      }
    } else {
      userSubscription.endAt = subscriptionEndDate;
      userSubscription.status = UserSubscriptionStatusV2.ACTIVE;
      userSubscription.lastTxn = applePayTransaction._id;

      await this.userSubscriptionV2Repository
        .getEntityManager()
        .persistAndFlush(userSubscription);

      // TODO: implement events & notifications
      await Promise.all([
        this.userSubscriptionV1Service.backfillUserSubscription({
          actualPlanPrice: applePayTransaction.txnAmount,
          actualPrice: applePayTransaction.txnAmount,
          country: plan.country,
          currency: plan.currency,
          currencySymbol:
            currency == CurrencyEnum.INR
              ? CurrencySymbolEnum.INR
              : CurrencySymbolEnum.USD,
          dialect: user.userCulture ?? Dialect.HAR,
          discount: 0,
          isGlobal: globalPayment,
          isTnplUser: true,
          isUpgrade: false,
          itemId: plan.name,
          os: OS.IOS,
          payingPrice: applePayTransaction.txnAmount,
          paymentGateway: PaymentGatewayEnum.APPLE_PAY,
          planDays: isTrial
            ? plan.validity.trialDays.toString()
            : plan.validity.frequency.toString(),
          planId: plan.name,
          planType: isTrial ? PlanTypesEnum.WEEKLY : plan.validity.planType,
          platform: Platform.APP,
          remarks: [],
          saved: 0,
          status: UserSubscriptionStatusV2.ACTIVE,
          subscriptionDate: new Date(),
          subscriptionId: applePayTransaction._id.toString(),
          subscriptionThrough: 'WEBHOOK',
          subscriptionValid: userSubscription.endAt,
          userId: user._id.toString(),
          vendor: PaymentGatewayEnum.APPLE_PAY,
        }),
        this.eventService.trackEvent({
          app_client_id: ClientAppIdEnum.IOS_MAIN,
          key: Events.SUBSCRIPTION_RENEWED,
          os: OS.IOS,
          payload: {
            plan_id: productId ?? plan.name,
            subscription_id: userSubscription._id.toString(),
          },
          user_id: user._id.toString(),
        }),
        // send subscription success notification
        this.notificationDispatcher.dispatchNotification({
          key: NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION,
          payload: {
            dialect: user.userCulture ?? Dialect.HAR,
            recipient: user._id.toString(),
          },
        }),
      ]);
    }

    return true;
  }

  /**
   * Handle subscription expired event
   */
  async handleSubscriptionExpired(transactionData: ApplePayTransactionPayload) {
    const {
      appAccountToken = '', // will never be empty as checking in the passing function
    } = transactionData;
    const user = await this.findUserByAppleSubscriptionId(appAccountToken);

    if (!user) {
      this.logger.error(
        `User not found for apple iosUserId:${appAccountToken}. Not handling subscription expired webhook`,
      );
      return;
    }
    this.logger.log(
      `Apple subscription expired webhook received for user:${user._id.toString()}`,
    );
    return true; // not handling only logging at the moment

    // const [userSubscriptionV1, userSubscriptionV2] = await Promise.all([
    //   this.userSubscriptionV1Service.oldBackendSubscriptionInfo(
    //     user._id.toString(),
    //   ),
    //   this.userSubscriptionV2Repository.findOne({
    //     userId: user._id.toString(),
    //   }),
    // ]);

    // if (userSubscriptionV1) {
    //   await this.userSubscriptionV1Service.updateUserSubscriptionStatus(
    //     user._id.toString(),
    //     UserSubscriptionStatusV2.EXPIRED,
    //     new Date(),
    //   );
    // }

    // if (
    //   userSubscriptionV2 &&
    //   userSubscriptionV2.subscriptionSource === SubscriptionSource.APPLE_PAY
    // ) {
    //   userSubscriptionV2.status = UserSubscriptionStatusV2.EXPIRED;
    //   await this.userSubscriptionV2Repository.save(userSubscriptionV2);
    // }

    // this.eventService.trackEvent({
    //   appClientId: ClientAppIdEnum.IOS_MAIN,
    //   key: Events.SUBSCRIPTION_EXPIRED,
    //   os: OS.IOS,
    //   payload: {
    //     planId: renewalInfo.offerIdentifier ?? '',
    //     subscriptionId: userSubscriptionV2?.id ?? '',
    //     timestamp: new Date(),
    //   },
    //   userId: user._id.toString(),
    // });
    // return data;
  }

  /**
   * Handle subscription renewal failure event
   */
  async handleSubscriptionFailedToRenew(payload: ResponseBodyV2DecodedPayload) {
    const { data } = payload;
    const transactionData = await this.validateTransactionData(
      data?.signedTransactionInfo,
    );
    this.logger.warn(
      `Apple subscription fail to renew for iosUserId:${transactionData.appAccountToken}`,
    );
    return data;
  }

  /**
   * Handle subscription renewal status change event
   */
  async handleSubscriptionRenewalStatusChanged(
    transactionData: ApplePayTransactionPayload,
    subtype?: string,
  ) {
    const user = await this.findUserByAppleSubscriptionId(
      transactionData.appAccountToken ?? '',
    );
    if (!user) {
      this.logger.error(
        `User not found for apple subscription id. Not handling handleSubscriptionRenewalStatusChanged for iosUserId:${transactionData.appAccountToken}`,
      );
      return;
    }

    const subscription = await this.userSubscriptionV2Repository.findOneOrFail(
      {
        userId: user._id.toString(),
      },
      {
        failHandler: () =>
          Errors.SUBSCRIPTION.NOT_FOUND(
            `Subscription not found for user:${user._id.toString()}`,
          ),
      },
    );

    const isTrialPeriodActive = isBefore(new Date(), subscription.trial.endAt);

    switch (subtype) {
      case Subtype.AUTO_RENEW_DISABLED:
        if (isTrialPeriodActive) {
          subscription.status = UserSubscriptionStatusV2.CANCELLED;
          this.userSubscriptionV2Repository
            .getEntityManager()
            .persistAndFlush(subscription);
          this.eventService.trackEvent({
            app_client_id: ClientAppIdEnum.IOS_MAIN,
            key: Events.SUBSCRIPTION_PAUSED,
            os: OS.IOS,
            payload: {
              action_source: ActionSource.PSP,
              plan_id:
                transactionData.productId ?? StringConstants.undefinedText,
              subscription_id: subscription._id.toString(),
            },
            user_id: user._id.toString(),
          });
        }

        return this.eventService.trackEvent({
          app_client_id: ClientAppIdEnum.IOS_MAIN,
          key: Events.MANDATE_REVOKED,
          os: OS.IOS,
          payload: {
            action_source: ActionSource.PSP,
            mandate_id: null,
            pg: PaymentGatewayEnum.APPLE_PAY,
            plan_id: transactionData.productId ?? StringConstants.undefinedText,
          },
          user_id: user._id.toString(),
        });
      case Subtype.AUTO_RENEW_ENABLED:
        if (isTrialPeriodActive) {
          subscription.status = UserSubscriptionStatusV2.ACTIVE;
          this.userSubscriptionV2Repository
            .getEntityManager()
            .persistAndFlush(subscription);
          this.eventService.trackEvent({
            app_client_id: ClientAppIdEnum.IOS_MAIN,
            key: Events.SUBSCRIPTION_RESUMED,
            os: OS.IOS,
            payload: {
              action_source: ActionSource.PSP,
              plan_id:
                transactionData.productId ?? StringConstants.undefinedText,
              subscription_id: subscription._id.toString(),
            },
            user_id: user._id.toString(),
          });
        }
        return this.eventService.trackEvent({
          app_client_id: ClientAppIdEnum.IOS_MAIN,
          key: Events.MANDATE_RESUMED,
          os: OS.IOS,
          payload: {
            action_source: ActionSource.PSP,
            mandate_id: null,
            plan_id: transactionData.productId ?? StringConstants.undefinedText,
            platform: Platform.APP,
          },
          user_id: user._id.toString(),
        });
      default:
        this.logger.warn(
          { data: { ...transactionData, subtype } },
          `Unhandled SubscriptionRenewalStatusChanged`,
        );
        return true;
    }
  }

  async initiatePaymentSession({
    country,
    ctxUser,
    selectedPlan,
  }: {
    country: string;
    selectedPlan: string;
    ctxUser: ContextUser;
  }): Promise<CreatePaymentSessionResponseDTO> {
    const user = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findOne({
        _id: new Types.ObjectId(ctxUser.id),
      }),
      Errors.USER.USER_NOT_FOUND('User not found'),
    );
    const appAccountToken = user.iosUserId ?? randomUUID();

    // if the user does not have an appleAppAccountToken, generate one and save it
    if (!user.iosUserId) {
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.userRepository.updateOne({
          filter: {
            _id: user._id,
          },
          update: {
            iosUserId: appAccountToken,
          },
        }),
        Errors.USER.USER_META_UPDATE_FAIL(
          `Fail to update iosUserId:${appAccountToken}`,
        ),
      );
    }

    // to support frontend issue
    const countryEnum: PlanCountryEnum =
      country == 'IN' ? PlanCountryEnum.IN : PlanCountryEnum.GLOBAL;

    const plan = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.planV2Repository.findOne({
        $or: [{ derivedFrom: selectedPlan }, { name: selectedPlan }],
        country: countryEnum,
      }),
      Errors.PLAN.NOT_FOUND('Plan not found'),
    );

    if (!plan.appleInAppPurchase) {
      throw new Error('Plan does not have an apple in app purchase');
    }

    // Check is the user is new, in that case add promotional offer signature:
    const userSubscriptionHistory =
      await this.userSubscriptionHistoryRepository.findOne({
        isTrial: true,
        userId: user._id.toString(),
      });

    const isTrialEligible = userSubscriptionHistory == null;
    let appliedOffer: AppleOfferType = AppleOfferType.NONE;

    if (isTrialEligible) {
      const appleSubscriptionTaken =
        await this.userSubscriptionHistoryRepository.findOne({
          userId: user._id.toString(),
          vendor: 'apple',
        });

      appliedOffer =
        appleSubscriptionTaken == null
          ? AppleOfferType.INTRODUCTORY
          : AppleOfferType.PROMOTIONAL;
    }

    const timestamp = Date.now();
    const nonce = randomUUID();

    // TODO: check for promotional offer logic
    const promotionalOffer =
      appliedOffer == AppleOfferType.PROMOTIONAL
        ? this.generatePromotionalOfferSignature({
            appAccountToken,
            nonce,
            offerId: plan.appleInAppPurchase.promotionalOfferId,
            productId: plan.appleInAppPurchase.introductoryOfferProductId,
            timestamp,
          })
        : null;

    const productId =
      appliedOffer == AppleOfferType.NONE
        ? plan.appleInAppPurchase.productId
        : plan.appleInAppPurchase.introductoryOfferProductId;

    return {
      appAccountToken,
      productId,
      promotionalOffer,
    };
  }
}
