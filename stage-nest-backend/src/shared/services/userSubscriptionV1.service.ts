import { Injectable, Logger } from '@nestjs/common';

import { ObjectId } from 'mongodb';

// import { PaymentGatewayEnum } from '@app/common/enums/common.enums';
import { QueryOrder } from '@mikro-orm/mongodb';

import { isBefore } from 'date-fns';

import { UserSubscriptionHistoryRepository } from '../../../common/repositories/userSubscriptionHistory.repository';
import { MandateV2Repository } from '../repositories/mandateV2.repository';
import { UserSubscriptionV2Repository } from '../repositories/userSubscriptionV2.repository';
import { MandateResponseDto } from '@app/admin/pg/dtos/revoke-mandate.request.dto';
import {
  ClientAppIdEnum,
  CurrencySymbolEnum,
  Dialect,
  OS,
  Platform,
} from '@app/common/enums/app.enum';
import {
  JuspayOrderStatusEnum,
  MasterMandateStatusEnum,
  RecurringTransactionStatusEnum,
  RevokeTrigger,
} from '@app/common/enums/common.enums';
import { JuspayOrderRepository } from '@app/common/repositories/juspayOrders.repository';
import { MasterMandateRepository } from '@app/common/repositories/masterMandate.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { stringToEnum } from '@app/common/utils/helpers';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import { ActionSource, Events } from '@app/events/interfaces/events.interface';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { PlanCountryEnum, PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { ApplePayTransactionPayload } from '@app/payment/interfaces/applePay.interface';
import {
  UserSubscriptionStatusV1,
  UserSubscriptionStatusV2,
} from '@app/shared/entities/userSubscriptionV2.entity';

export interface SubscriptionData {
  actualPlanPrice: number;
  actualPrice: number;
  country: PlanCountryEnum;
  currency: string;
  currencySymbol: CurrencySymbolEnum;
  dialect: Dialect;
  discount: number;
  isGlobal: boolean;
  isTnplUser: boolean;
  isUpgrade: boolean;
  itemId: string;
  os: OS;
  payingPrice: number;
  paymentGateway: PaymentGatewayEnum;
  planDays: string; // Db is storing it in string
  planId: string;
  planType: PlanTypesEnum;
  platform: Platform;
  receiptInfo?: ApplePayTransactionPayload & { version: number };
  remarks: string[];
  saved: number;
  status: UserSubscriptionStatusV2;
  subscriptionDate: Date;
  subscriptionId: string;
  subscriptionThrough: 'WEBHOOK';
  subscriptionValid: Date;
  userId: string;
  vendor: PaymentGatewayEnum;
}

interface UserSubscriptionHistoryData extends SubscriptionData {
  adid: string;
  deviceId: string;
  isRecurring: boolean;
  isRecurringSubscription: boolean;
  isRenew: boolean;
  isTrial: boolean;
  primaryMobileNumber: string;
  renewalRecurringCount: number;
}

export interface OldBackendSubscriptionInfo {
  mandateActive: boolean;
  trialEndDate?: Date;
  trialStartDate?: Date;
  trialTaken: boolean;
}

@Injectable()
export class UserSubscriptionV1Service {
  private logger = new Logger(UserSubscriptionV1Service.name);
  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly userSubscriptionV1Repository: UserSubscriptionV1Repository,
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly masterMandateRepository: MasterMandateRepository,
    private readonly juspayOrderRepository: JuspayOrderRepository,
    private readonly userRepository: UserRepository,
    private readonly mandateV2Repository: MandateV2Repository,
    private readonly eventService: EventService,
  ) {}

  private addUserSubscriptionHistory(
    userSubscriptionHistoryData: UserSubscriptionHistoryData,
  ) {
    const paymentGateway =
      userSubscriptionHistoryData.paymentGateway + '_Recurring';

    return this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionHistoryRepository.create({
        ...userSubscriptionHistoryData,
        paymentGateway,
      }),
      Errors.USER_SUBSCRIPTION.HISTORY_CREATION_FAILED(
        'Failed to create user subscription history.',
      ),
    );
  }

  async backfillUserSubscription(subscriptionData: SubscriptionData) {
    const { subscriptionValid, userId } = subscriptionData;
    const subscriptionStatus = UserSubscriptionStatusV1.ACTIVE;

    // TODO: check that user subscription exists or not, if exists just update it

    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findById(
        userId,
        ['_id', 'deviceId', 'primaryMobileNumber', 'adid'],
        {
          lean: true,
        },
      ),
      Errors.USER.USER_NOT_FOUND(),
    );
    const { adid, deviceId, primaryMobileNumber } = user;

    const userSubscription = await this.userSubscriptionV1Repository.findOne(
      {
        userId,
      },
      ['_id'],
      {
        sort: { createdAt: -1 },
      },
    );

    const userSubscriptionHistories =
      await this.userSubscriptionHistoryRepository.find({ userId }, undefined, {
        lean: true,
      });
    const renewalRecurringCount =
      userSubscriptionHistories == null
        ? -1
        : userSubscriptionHistories.length - 1;

    if (!userSubscription) {
      await this.errorHandler.raiseErrorIfNullAsync(
        this.userSubscriptionV1Repository.create({
          deviceIdArr: [deviceId ?? 'none'],
          subscriptionExpiry: subscriptionValid,
          subscriptionStatus,
          userId,
        }),
        Errors.USER_SUBSCRIPTION.NOT_FOUND(),
      );

      return this.addUserSubscriptionHistory({
        ...subscriptionData,
        adid: adid ?? 'none',
        deviceId: deviceId ?? 'none',
        isRecurring: true,
        isRecurringSubscription: true,
        isRenew: true,
        isTrial: true,
        primaryMobileNumber: primaryMobileNumber,
        renewalRecurringCount,
      });
    }

    await this.updateUserSubscriptionStatus(
      userId,
      UserSubscriptionStatusV2.ACTIVE,
      subscriptionValid,
    );

    return this.addUserSubscriptionHistory({
      ...subscriptionData,
      adid: adid ?? 'none',
      deviceId: deviceId ?? 'none',
      isRecurring: true,
      isRecurringSubscription: true,
      isRenew: true,
      isTrial: renewalRecurringCount == -1,
      primaryMobileNumber: primaryMobileNumber,
      renewalRecurringCount,
    });
  }

  async fetchMandateStatusByVendor(
    vendor: PaymentGatewayEnum,
    docId: string,
    userId: string,
  ): Promise<string | null> {
    switch (vendor) {
      case PaymentGatewayEnum.PHONEPE:
      case PaymentGatewayEnum.PAYTM: {
        const masterMandate = await this.masterMandateRepository.findOne(
          {
            _id: new ObjectId(docId),
          },
          ['status'],
        );
        return masterMandate?.status == undefined
          ? null
          : masterMandate?.status;
      }
      case PaymentGatewayEnum.JUSPAY:
      case PaymentGatewayEnum.JUSPAY_CHECKOUT: {
        const juspayOrder = await this.juspayOrderRepository.findOne({
          parentOrder: { $ne: null },
        });

        return juspayOrder?.orderStatus == undefined
          ? null
          : juspayOrder?.orderStatus;
      }
      case PaymentGatewayEnum.SETU: {
        const mandate = await this.mandateV2Repository.findOneOrFail(
          {
            userId,
          },
          {
            first: 1,
            orderBy: { createdAt: QueryOrder.DESC },
          },
        );
        return mandate.status;
      }
      case PaymentGatewayEnum.RAZORPAY:
      case PaymentGatewayEnum.APPLE_PAY:
      case PaymentGatewayEnum.LEGACY_APPLE: {
        return null;
      }
    }

    return null;
  }

  async fetchUserActiveMandates(phoneNumber: string) {
    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findOne({ primaryMobileNumber: phoneNumber }, [
        '_id',
      ]),
      Errors.USER.USER_NOT_FOUND(),
    );

    const history = await this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionHistoryRepository.find(
        {
          status: 'active',
          userId: user._id.toString(),
        },
        [
          'vendor',
          'userId',
          'platform',
          'planId',
          'masterMandateId',
          'mandateOrderId',
          'juspayOrderId',
        ],
        { lean: true, sort: { createdAt: -1 } },
      ),
      Errors.USER_SUBSCRIPTION.NOT_FOUND(),
    );

    const mandateList: MandateResponseDto[] = [];

    await Promise.all(
      history.map(async (doc) => {
        let docId = '';
        switch (doc.vendor) {
          case PaymentGatewayEnum.PHONEPE:
          case PaymentGatewayEnum.PAYTM: {
            docId = doc.masterMandateId?._id.toString() ?? '';
            break;
          }
          case PaymentGatewayEnum.SETU: {
            const mandate = await this.mandateV2Repository.findOne(
              { userId: user._id.toString() },
              {
                orderBy: { createdAt: QueryOrder.DESC },
              },
            );
            docId = mandate?._id.toString() ?? '';
            break;
          }
          case PaymentGatewayEnum.JUSPAY_CHECKOUT:
          case PaymentGatewayEnum.JUSPAY: {
            docId = doc.juspayOrderId ?? '';
            break;
          }
        }
        mandateList.push({
          ...doc,
          docId,
          platform: stringToEnum(Platform, doc.platform) ?? Platform.APP,
        });
      }),
    );

    // filter only active mandates
    const promises = mandateList.map(({ docId, userId, vendor }) =>
      this.fetchMandateStatusByVendor(vendor, docId, userId),
    );

    const responses = await Promise.all(promises);

    const activeMandatesList: MandateResponseDto[] = [];

    for (let i = 0; i < responses.length; i += 1) {
      const response = responses[i];
      const vendor = history[i].vendor;
      if (response !== null) {
        switch (vendor) {
          case PaymentGatewayEnum.PHONEPE:
          case PaymentGatewayEnum.PAYTM:
          case PaymentGatewayEnum.SETU: {
            if (response == MasterMandateStatusEnum.MANDATE_ACTIVE.toString()) {
              activeMandatesList.push(mandateList[i]);
            }
            break;
          }
          case PaymentGatewayEnum.JUSPAY_CHECKOUT:
          case PaymentGatewayEnum.JUSPAY: {
            const activeStatusList = [
              JuspayOrderStatusEnum.AUTH_TXN_COMPLETED.toString(),
              JuspayOrderStatusEnum.AUTH_TXN_GENERATED.toString(),
              JuspayOrderStatusEnum.MANDATE_RESUMED.toString(),
              JuspayOrderStatusEnum.NOTIFICATION_SUCCEEDED.toString(),
              JuspayOrderStatusEnum.ORDER_FAILED.toString(),
              JuspayOrderStatusEnum.ORDER_SUCCEEDED.toString(),
              JuspayOrderStatusEnum.RECURRING_PAYMENT_COMPLETED.toString(),
              JuspayOrderStatusEnum.RECURRING_PAYMENT_SCHEDULED.toString(),
              JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGERED.toString(),
              JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGER_FAILED.toString(),
              JuspayOrderStatusEnum.RESUMED.toString(),
            ];
            if (activeStatusList.includes(response)) {
              activeMandatesList.push(mandateList[i]);
            }
            break;
          }
        }
      }
    }

    return activeMandatesList;
  }

  async oldBackendSubscriptionInfo(
    userId: string,
  ): Promise<OldBackendSubscriptionInfo> {
    const trialSubscriptionHistory =
      await this.userSubscriptionHistoryRepository.findOne(
        { userId },
        ['vendor', 'isTrial', 'subscriptionDate', 'subscriptionValid'],
        { lean: true, sort: { createdAt: 1 } }, // fetch the first entry
      );

    if (!trialSubscriptionHistory)
      return { mandateActive: false, trialTaken: false };

    const { isTrial, subscriptionDate, subscriptionValid, vendor } =
      trialSubscriptionHistory;

    if (!isTrial) return { mandateActive: false, trialTaken: false }; // possible for 1 time payments

    let mandateActive = false;

    // Check for active mandate in old infra
    if (
      vendor == PaymentGatewayEnum.PAYTM ||
      vendor == PaymentGatewayEnum.PHONEPE
    ) {
      const mandate = await this.masterMandateRepository.findOne(
        { user: userId },
        ['status'],
        { lean: true },
      );
      mandateActive =
        mandate != null &&
        mandate.status === MasterMandateStatusEnum.MANDATE_ACTIVE;
    } else if (vendor == PaymentGatewayEnum.JUSPAY) {
      const juspayMandate = await this.juspayOrderRepository.findOne(
        { user: userId },
        ['orderStatus'],
        { lean: true },
      );
      const juspayMandateStoppedStatusList = [
        JuspayOrderStatusEnum.CANCELLED,
        JuspayOrderStatusEnum.MANDATE_PAUSED,
        JuspayOrderStatusEnum.MANDATE_REVOKED,
        JuspayOrderStatusEnum.PAUSED,
      ];
      mandateActive =
        juspayMandate != null &&
        !juspayMandateStoppedStatusList.includes(juspayMandate.orderStatus);
    }

    return {
      mandateActive,
      trialEndDate: subscriptionValid,
      trialStartDate: subscriptionDate,
      trialTaken: true,
    };
  }

  async revokeMandate(
    vendor: PaymentGatewayEnum,
    userId: string,
    docId: string,
    trigger: RevokeTrigger,
    platform: Platform,
    planId: string,
  ): Promise<boolean> {
    if (!docId) {
      this.logger.error(
        `Failed to revoke ${vendor} for user:${userId} and docId:${docId}`,
      );
      return false;
    }

    this.eventService.trackEvent({
      app_client_id:
        platform === Platform.WEB
          ? ClientAppIdEnum.WEB
          : ClientAppIdEnum.ANDROID_MAIN,
      key: Events.MANDATE_PAUSED,
      os: OS.ANDROID,
      payload: {
        action_source:
          trigger == RevokeTrigger.ADMIN_DASHBOARD
            ? ActionSource.SUPPORT
            : ActionSource.NEW_MANDATE,
        mandate_id: docId,
        pg: vendor,
        plan_id: planId,
        platform,
      },
      user_id: userId,
    });

    switch (vendor) {
      case PaymentGatewayEnum.PHONEPE:
      case PaymentGatewayEnum.PAYTM: {
        const status =
          trigger == RevokeTrigger.ADMIN_DASHBOARD
            ? MasterMandateStatusEnum.MANDATE_PAUSED_IN_APP
            : MasterMandateStatusEnum.MANDATE_CANCELLED_AND_STARTED_ANEW;
        await this.masterMandateRepository.updateOne({
          filter: {
            _id: new ObjectId(docId),
            status: MasterMandateStatusEnum.MANDATE_ACTIVE,
          },
          update: {
            $push: {
              statusHistory: {
                _id: new ObjectId(),
                status,
                time: new Date(),
              },
              txnStatusHistory: {
                _id: new ObjectId(),
                time: new Date(),
                txnStatus: RecurringTransactionStatusEnum.NOTIFICATION_PAUSED,
              },
            },
            status,
            txnStatus: RecurringTransactionStatusEnum.NOTIFICATION_PAUSED,
          },
        });
        return true;
      }
      case PaymentGatewayEnum.JUSPAY:
      case PaymentGatewayEnum.JUSPAY_CHECKOUT: {
        const activeStatusList = [
          JuspayOrderStatusEnum.AUTH_TXN_COMPLETED,
          JuspayOrderStatusEnum.AUTH_TXN_GENERATED,
          JuspayOrderStatusEnum.MANDATE_RESUMED,
          JuspayOrderStatusEnum.NOTIFICATION_SUCCEEDED,
          JuspayOrderStatusEnum.ORDER_FAILED,
          JuspayOrderStatusEnum.ORDER_SUCCEEDED,
          JuspayOrderStatusEnum.RECURRING_PAYMENT_COMPLETED,
          JuspayOrderStatusEnum.RECURRING_PAYMENT_SCHEDULED,
          JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGERED,
          JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGER_FAILED,
          JuspayOrderStatusEnum.RESUMED,
        ];
        const orderStatus =
          trigger == RevokeTrigger.ADMIN_DASHBOARD
            ? JuspayOrderStatusEnum.MANDATE_PAUSED
            : JuspayOrderStatusEnum.CANCELLED;
        await this.juspayOrderRepository.updateOne({
          filter: {
            _id: new ObjectId(docId),
            orderStatus: { $in: activeStatusList },
          },
          update: {
            $push: {
              orderStatusHistory: {
                _id: new ObjectId(),
                event: 'default',
                plan: new ObjectId(planId),
                status: orderStatus,
                time: new Date(),
              },
            },
            orderStatus,
          },
        });
        return true;
      }
      case PaymentGatewayEnum.RAZORPAY: {
        this.logger.log('Not handling razorpay revoke at the moment');
        break;
      }
      case PaymentGatewayEnum.SETU: {
        const status =
          trigger == RevokeTrigger.ADMIN_DASHBOARD
            ? MasterMandateStatusEnum.MANDATE_PAUSED
            : MasterMandateStatusEnum.MANDATE_CANCELLED_AND_STARTED_ANEW;
        const mandate = await this.mandateV2Repository.findOneOrFail(
          {
            userId,
          },
          {
            first: 1,
            orderBy: { createdAt: QueryOrder.DESC },
          },
        );
        mandate.status = status;
        await this.mandateV2Repository
          .getEntityManager()
          .persistAndFlush(mandate);
        const userSubscription =
          await this.userSubscriptionV2Repository.findOneOrFail(
            { userId },
            {
              failHandler: () =>
                Errors.USER_SUBSCRIPTION.NOT_FOUND(
                  `Could not find user subscription for userId:${userId}`,
                ),
            },
          );
        if (isBefore(new Date(), userSubscription.trial.endAt)) {
          userSubscription.status = UserSubscriptionStatusV2.CANCELLED;
          await this.userSubscriptionV2Repository
            .getEntityManager()
            .persistAndFlush(userSubscription);
        }
        return true;
      }
      case PaymentGatewayEnum.APPLE_PAY:
      case PaymentGatewayEnum.LEGACY_APPLE: {
        this.logger.error(
          `Can't revoke ${vendor} mandate for userId:${userId}`,
        );
        break;
      }
      default: {
        this.logger.error(
          `Unhandled revoke ${vendor} mandate request for userId:${userId}`,
        );
        break;
      }
    }

    return false;
  }

  async updateUserSubscriptionStatus(
    userId: string,
    status: UserSubscriptionStatusV2,
    subscriptionExpiry: Date,
  ) {
    let subscriptionStatus = UserSubscriptionStatusV1.EXPIRED;

    if (status == UserSubscriptionStatusV2.ACTIVE) {
      subscriptionStatus = UserSubscriptionStatusV1.ACTIVE;
    }

    await this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionV1Repository.updateOne({
        filter: { userId },
        update: {
          subscriptionExpiry,
          subscriptionStatus,
        },
      }),
      Errors.USER_SUBSCRIPTION.UPDATE_FAILED(
        `failed to update user subscription status to ${status} for userId:${userId}`,
      ),
    );
  }
}
