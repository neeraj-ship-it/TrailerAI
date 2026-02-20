import { MikroORM, QueryOrder } from '@mikro-orm/mongodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import { randomUUID } from 'node:crypto';

import { addDays, addHours, differenceInDays } from 'date-fns';

import { PaymentSource } from '../constants/constants';
import { GetUserSubscriptionResponseDto } from '../dtos/getUserSubscription.response.dto';
import { SubscriptionAndMandateStatusResponseDTO } from '../dtos/subscriptionAndMandateStatus.response.dto';
import { MappedMandateStatus } from '../interfaces/userSubscription.interface';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { ClientAppIdEnum, OS } from '@app/common/enums/app.enum';
import {
  SubscriptionStatusEnum,
  MasterMandateStatusEnum,
  AppPayStatusEnum,
  JuspayOrderStatusEnum,
  UserSubscriptionHistoryVendorEnum,
  UserSubscriptionHistoryStatusEnum,
  MandateStatusNotAvailableEnum,
} from '@app/common/enums/common.enums';
import { JuspayOrderRepository } from '@app/common/repositories/juspayOrders.repository';
import { MasterMandateRepository } from '@app/common/repositories/masterMandate.repository';
import { OrdersRepository } from '@app/common/repositories/orders.repository';
import { PlanRepository } from '@app/common/repositories/plan.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import {
  Events,
  SubscriptionExtendedEvent,
  TrialExtendedEvent,
} from '@app/events/interfaces/events.interface';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { PlanStatusEnum } from '@app/payment/enums/plan.enum';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import {
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from '@app/shared/entities/userSubscriptionV2.entity';
import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Plan } from 'common/entities/plan.entity';

export interface GetLatestSubscriptionHistoryResponse {
  giveTvAdoption: boolean;
  latestSubscriptionHistory: Partial<UserSubscriptionHistory> | null;
}

@Injectable()
export class UserSubscriptionService {
  private readonly logger = new Logger(UserSubscriptionService.name);

  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly userSubscriptionV1Repository: UserSubscriptionV1Repository,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly masterMandateRepository: MasterMandateRepository,
    private readonly juspayOrderRepository: JuspayOrderRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly mandateV2Repository: MandateV2Repository,
    private readonly planRepository: PlanRepository,
    private readonly eventService: EventService,
    private readonly userRepository: UserRepository,
    private readonly orm: MikroORM,
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(MasterMandate.name)
    private readonly masterMandateModel: Model<MasterMandate>,
    @InjectModel(UserSubscriptionV1.name)
    private readonly userSubscriptionV1Model: Model<UserSubscriptionV1>,
  ) {}

  private async checkTvAdoptionFreePlanGiven(userId: string): Promise<boolean> {
    try {
      const tvAdoption = await this.userSubscriptionHistoryRepository.findOne(
        {
          planId: {
            $in: [
              APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
                .TV_ADOPTION_FREE_TRIAL_PLAN_ID,
              APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
                .TV_ADOPTION_FREE_SUBSCRIPTION_PLAN_ID,
            ],
          },
          userId,
        },
        ['planId'],
        { lean: true },
      );
      return !!tvAdoption;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to check TV adoption free plan given`,
      );
      return false;
    }
  }

  private async createTvAdoptionSubscriptionHistory(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    plan: Partial<Plan>,
    subscriptionId: string,
    subscriptionDate: Date,
    subscriptionValid: Date,
    session?: ClientSession,
  ) {
    const { planId } = plan;

    const newSubscriptionHistory =
      await this.errorHandler.raiseErrorIfNullAsync(
        this.userSubscriptionHistoryRepository.create(
          {
            cmsLoginEmail: 'admin@stage.in',
            cmsLoginId: PaymentGatewayEnum.BACKEND,
            cmsLoginName: PaymentGatewayEnum.BACKEND,
            cmsLoginNumber: 'none',
            country: latestSubscriptionHistory.country,
            couponCode: 'none',
            currency: latestSubscriptionHistory.currency,
            currencySymbol: latestSubscriptionHistory.currencySymbol,
            dialect: latestSubscriptionHistory.dialect,
            isGlobal: false,
            isRecommended: false,
            isRecurring: false,
            isRecurringSubscription: false,
            isRenew: false,
            isTrial: false,
            isUpgrade: false,
            itemId: planId,
            juspayOrderId: '',
            mandateOrderId: null,
            masterMandateId: null,
            order: null,
            os: latestSubscriptionHistory.os,
            payingPrice: 0,
            paymentGateway: PaymentGatewayEnum.BACKEND,
            paymentSource: PaymentSource.BACKEND_INITIATED,
            planDays: plan.totalDays,
            planId: planId,
            planType: plan.planType,
            platform: latestSubscriptionHistory.platform,
            primaryMobileNumber: latestSubscriptionHistory.primaryMobileNumber,
            renewalRecurringCount:
              latestSubscriptionHistory.renewalRecurringCount,
            saved: latestSubscriptionHistory.saved,
            signature: 'none',
            status: UserSubscriptionHistoryStatusEnum.ACTIVE,
            subscriptionDate: subscriptionDate,
            subscriptionId: subscriptionId,
            subscriptionThrough: PaymentGatewayEnum.BACKEND,
            subscriptionValid: subscriptionValid,
            totalCount: latestSubscriptionHistory.totalCount,
            userId: userId,
            vendor: PaymentGatewayEnum.BACKEND,
          },
          { session },
        ),
        Errors.USER_SUBSCRIPTION.HISTORY_CREATION_FAILED(
          'Failed to create TV adoption subscription history',
        ),
      );

    this.logger.log(
      {
        subscriptionId,
        userId,
      },
      `Successfully created TV adoption subscription history`,
    );

    return newSubscriptionHistory;
  }
  private async createTvAdoptionSubscriptionHistoryOnMandateSuccess(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    plan: Partial<Plan>,
    subscriptionId: string,
    subscriptionDate: Date,
    subscriptionValid: Date,
    session?: ClientSession,
  ) {
    const { planId } = plan;

    const newSubscriptionHistory =
      await this.errorHandler.raiseErrorIfNullAsync(
        this.userSubscriptionHistoryRepository.create(
          {
            cmsLoginEmail: 'admin@stage.in',
            cmsLoginId: PaymentGatewayEnum.BACKEND,
            cmsLoginName: PaymentGatewayEnum.BACKEND,
            cmsLoginNumber: 'none',
            country: latestSubscriptionHistory.country,
            couponCode: 'none',
            currency: latestSubscriptionHistory.currency,
            currencySymbol: latestSubscriptionHistory.currencySymbol,
            dialect: latestSubscriptionHistory.dialect,
            isGlobal: false,
            isRecommended: false,
            isRecurring: false,
            isRecurringSubscription: false,
            isRenew: true,
            isTrial: false,
            isUpgrade: false,
            itemId: planId,
            juspayOrderId: '',
            mandateOrderId: null,
            masterMandateId: null,
            order: null,
            os: latestSubscriptionHistory.os,
            payingPrice: 0,
            paymentGateway: PaymentGatewayEnum.BACKEND,
            paymentSource: PaymentSource.BACKEND_INITIATED,
            planDays: plan.totalDays,
            planId: planId,
            planType: plan.planType,
            platform: latestSubscriptionHistory.platform,
            primaryMobileNumber: latestSubscriptionHistory.primaryMobileNumber,
            renewalRecurringCount:
              latestSubscriptionHistory.renewalRecurringCount,
            saved: latestSubscriptionHistory.saved,
            signature: 'none',
            status: UserSubscriptionHistoryStatusEnum.ACTIVE,
            subscriptionDate: subscriptionDate,
            subscriptionId: subscriptionId,
            subscriptionThrough: PaymentGatewayEnum.BACKEND,
            subscriptionValid: subscriptionValid,
            totalCount: latestSubscriptionHistory.totalCount,
            userId: userId,
            vendor: PaymentGatewayEnum.BACKEND,
          },
          { session },
        ),
        Errors.USER_SUBSCRIPTION.HISTORY_CREATION_FAILED(
          'Failed to create user subscription history',
        ),
      );

    this.logger.log(
      {
        subscriptionId,
        userId,
      },
      `Successfully created TV adoption subscription history`,
    );

    return newSubscriptionHistory;
  }

  private getAppClientIdFromBundleIdentifier(
    bundleIdentifier?: string,
  ): ClientAppIdEnum | null {
    if (!bundleIdentifier) return null;

    const bundleId = bundleIdentifier.toLowerCase();

    const orderedAppIds: ClientAppIdEnum[] = [
      ClientAppIdEnum.ANDROID_HAR_MINI,
      ClientAppIdEnum.ANDROID_RAJ_MINI,
      ClientAppIdEnum.IOS_MAIN,
      ClientAppIdEnum.WEB,
      ClientAppIdEnum.ANDROID_MAIN,
    ];

    for (const appId of orderedAppIds) {
      const token = appId.toLowerCase();
      if (bundleId.includes(token)) {
        return appId;
      }
    }

    return null;
  }

  private async getApplePayMandateStatus(
    userId: string,
  ): Promise<MappedMandateStatus> {
    // Use forked EntityManager to avoid global context error in Kafka consumers
    const em = this.orm.em.fork();
    const appleSubscriptionV2 = await em.findOne(
      UserSubscriptionV2,
      { userId },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );

    return this.mapApplePayStatus(
      appleSubscriptionV2?.status ??
        MandateStatusNotAvailableEnum.NOT_AVAILABLE,
    );
  }

  private async getJuspayMandateStatus(
    userId: string,
  ): Promise<MappedMandateStatus> {
    const juspayOrder = await this.juspayOrderRepository.findOne(
      { user: new Types.ObjectId(userId) },
      ['orderStatus'],
      { sort: { createdAt: -1 } },
    );

    if (juspayOrder?.orderStatus === JuspayOrderStatusEnum.MANDATE_MIGRATED) {
      return await this.getMasterMandateStatus(userId);
    }

    return this.mapOrderStatus(
      juspayOrder?.orderStatus ?? MandateStatusNotAvailableEnum.NOT_AVAILABLE,
    );
  }

  private async getMasterMandateStatus(
    userId: string,
  ): Promise<MappedMandateStatus> {
    const masterMandate = await this.masterMandateRepository.findOne(
      { user: new Types.ObjectId(userId) },
      ['status'],
      { sort: { createdAt: -1 } },
    );
    return masterMandate?.status ?? MandateStatusNotAvailableEnum.NOT_AVAILABLE;
  }

  private async getRazorpayMandateStatus(
    userId: string,
  ): Promise<MappedMandateStatus> {
    const razorpayOrder = await this.ordersRepository.findOne(
      { user: new Types.ObjectId(userId) },
      ['orderStatus'],
      { sort: { createdAt: -1 } },
    );

    return this.mapOrderStatus(
      razorpayOrder?.orderStatus ?? MandateStatusNotAvailableEnum.NOT_AVAILABLE,
    );
  }

  private async getSetuMandateStatus(
    userId: string,
  ): Promise<MappedMandateStatus> {
    // Use forked EntityManager to avoid global context error in Kafka consumers
    const em = this.orm.em.fork();
    const mandatesv2 = await em.findOne(
      MandateV2,
      { userId },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );
    return mandatesv2?.status ?? MandateStatusNotAvailableEnum.NOT_AVAILABLE;
  }

  private mapApplePayStatus(status: string): MappedMandateStatus {
    const statusMap: Record<string, MasterMandateStatusEnum> = {
      [AppPayStatusEnum.ACTIVE]: MasterMandateStatusEnum.MANDATE_ACTIVE,
      [AppPayStatusEnum.CANCELLED]: MasterMandateStatusEnum.MANDATE_REVOKED_PSP,
      [AppPayStatusEnum.EXPIRED]: MasterMandateStatusEnum.MANDATE_ACTIVE,
    };
    return statusMap[status] || MandateStatusNotAvailableEnum.NOT_AVAILABLE;
  }

  private mapLatestSubscriptionStatus(latestSubscriptionDetails: {
    isTrial: boolean;
    status: string;
  }): SubscriptionStatusEnum {
    return latestSubscriptionDetails.isTrial === true
      ? latestSubscriptionDetails.status ===
        UserSubscriptionHistoryStatusEnum.ACTIVE
        ? SubscriptionStatusEnum.TRIAL_ACTIVE
        : SubscriptionStatusEnum.TRIAL_OVER
      : latestSubscriptionDetails.status ===
          UserSubscriptionHistoryStatusEnum.ACTIVE
        ? SubscriptionStatusEnum.SUBSCRIPTION_ACTIVE
        : SubscriptionStatusEnum.SUBSCRIPTION_OVER;
  }

  private mapOrderStatus(status: string): MappedMandateStatus {
    const statusMap: Record<string, MasterMandateStatusEnum> = {
      [JuspayOrderStatusEnum.AUTH_TXN_COMPLETED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.CANCELLED]:
        MasterMandateStatusEnum.MANDATE_CANCELLED_AND_STARTED_ANEW,
      [JuspayOrderStatusEnum.MANDATE_REVOKED]:
        MasterMandateStatusEnum.MANDATE_REVOKED_PSP,
      [JuspayOrderStatusEnum.NOTIFICATION_FAILED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.NOTIFICATION_SUCCEEDED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.ORDER_FAILED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.PAUSED]:
        MasterMandateStatusEnum.MANDATE_PAUSED_IN_APP,
      [JuspayOrderStatusEnum.RECURRING_PAYMENT_COMPLETED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.RECURRING_PAYMENT_SCHEDULED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGER_FAILED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.RECURRING_PAYMENT_TRIGGERED]:
        MasterMandateStatusEnum.MANDATE_ACTIVE,
      [JuspayOrderStatusEnum.REFUNDED]:
        MasterMandateStatusEnum.MANDATE_REFUNDED,
    };
    return statusMap[status] || MandateStatusNotAvailableEnum.NOT_AVAILABLE;
  }

  private async sendSubscriptionExtendedEvent(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    plan: Partial<Plan>,
    newExpiryDate: Date,
    subscriptionId: string,
  ): Promise<void> {
    try {
      // Get user to determine OS and app_client_id
      const user = await this.errorHandler.raiseErrorIfNullAsync(
        this.userRepository.findOne(
          { _id: new Types.ObjectId(userId) },
          ['bundleIdentifier', 'signUpOs'],
          { lean: true },
        ),
        Errors.USER.USER_NOT_FOUND(),
      );

      // Get OS from subscription history or user, default to OTHER
      const osString =
        latestSubscriptionHistory.os || user?.signUpOs || 'other';
      const os =
        Object.values(OS).find(
          (osValue) => osValue.toLowerCase() === osString.toLowerCase(),
        ) || OS.OTHER;

      // Determine app_client_id from bundleIdentifier if available
      const appClientId = this.getAppClientIdFromBundleIdentifier(
        user?.bundleIdentifier,
      );

      if (!latestSubscriptionHistory.subscriptionValid) {
        this.logger.warn(
          { userId },
          `Cannot send subscription extended event: subscriptionValid is missing`,
        );
        return;
      }

      const originalExpiryDate = latestSubscriptionHistory.subscriptionValid;
      const noOfDaysExtended = plan.totalDays ?? 0;

      const subscriptionExtendedEvent: SubscriptionExtendedEvent = {
        app_client_id: appClientId,
        key: Events.SUBSCRIPTION_EXTENDED,
        os,
        payload: {
          new_expiry_date: newExpiryDate,
          no_of_days_extended: noOfDaysExtended,
          original_expiry_date: originalExpiryDate,
          plan_id: plan.planId ?? 'backend',
          subscription_id: subscriptionId,
        },
        user_id: userId,
      };

      this.eventService.trackEvent(subscriptionExtendedEvent);

      this.logger.log(
        {
          newExpiryDate,
          noOfDaysExtended,
          originalExpiryDate,
          subscriptionId,
          userId,
        },
        `Subscription extended event sent successfully`,
      );
    } catch (error) {
      // Don't throw - event sending failure shouldn't break the main flow
      this.logger.error(
        { error, subscriptionId, userId },
        `Failed to send subscription extended event`,
      );
    }
  }

  private async sendTrialExtendedEvent(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
    plan: Partial<Plan>,
    newExpiryDate: Date,
    subscriptionId: string,
  ): Promise<void> {
    try {
      // Get user to determine OS and app_client_id
      const user = await this.errorHandler.raiseErrorIfNullAsync(
        this.userRepository.findOne(
          { _id: new Types.ObjectId(userId) },
          ['bundleIdentifier', 'signUpOs'],
          { lean: true },
        ),
        Errors.USER.USER_NOT_FOUND(),
      );

      // Get OS from subscription history or user, default to OTHER
      const osString =
        latestSubscriptionHistory.os || user?.signUpOs || 'other';
      const os =
        Object.values(OS).find(
          (osValue) => osValue.toLowerCase() === osString.toLowerCase(),
        ) || OS.OTHER;

      // Determine app_client_id from bundleIdentifier if available
      const appClientId = this.getAppClientIdFromBundleIdentifier(
        user?.bundleIdentifier,
      );

      if (!latestSubscriptionHistory.subscriptionValid) {
        this.logger.warn(
          { userId },
          `Cannot send trial extended event: subscriptionValid is missing`,
        );
        return;
      }

      const originalExpiryDate = latestSubscriptionHistory.subscriptionValid;
      const noOfDaysExtended = plan.totalDays ?? 0;

      const trialExtendedEvent: TrialExtendedEvent = {
        app_client_id: appClientId,
        key: Events.TRIAL_EXTENDED,
        os,
        payload: {
          new_expiry_date: newExpiryDate,
          no_of_days_extended: noOfDaysExtended,
          original_expiry_date: originalExpiryDate,
          plan_id: plan.planId || PaymentGatewayEnum.BACKEND,
          subscription_id: subscriptionId,
        },
        user_id: userId,
      };

      this.eventService.trackEvent(trialExtendedEvent);

      this.logger.log(
        {
          newExpiryDate,
          noOfDaysExtended,
          originalExpiryDate,
          subscriptionId,
          userId,
        },
        `Trial extended event sent successfully`,
      );
    } catch (error) {
      // Don't throw - event sending failure shouldn't break the main flow
      this.logger.error(
        { error, subscriptionId, userId },
        `Failed to send trial extended event`,
      );
    }
  }

  private async updateMasterMandateForTvAdoption(
    userId: string,
    plan: Partial<Plan>,
    extensionDate: Date,
    subscriptionValid: Date,
    vendor?: PaymentGatewayEnum,
    session?: ClientSession,
  ): Promise<void> {
    if (vendor === PaymentGatewayEnum.JUSPAY) {
      return;
    }

    const masterMandate = await this.masterMandateModel.findOne(
      {
        status: MasterMandateStatusEnum.MANDATE_ACTIVE,
        user: new Types.ObjectId(userId),
      },
      null,
      { readPreference: 'primary', session },
    );

    if (!masterMandate) {
      return;
    }

    const nextTriggerDate = addDays(
      subscriptionValid,
      APP_CONFIGS.PLATFORM.MANDATE_TRIGGER_DATE_OFFSET_DAYS,
    );

    const renewalDataArrayLength = masterMandate.renewalData?.length ?? 0;
    const lastIndex =
      renewalDataArrayLength > 0 ? renewalDataArrayLength - 1 : 0;

    await this.errorHandler.raiseErrorIfNullAsync(
      this.masterMandateModel.updateOne(
        {
          _id: masterMandate._id,
        },
        {
          $set: {
            [`renewalData.${lastIndex}.renewalDate`]: subscriptionValid,
            nextRenewalDate: subscriptionValid,
            nextTriggerDate,
          },
        },
        { session },
      ),
      Errors.MANDATE.UPDATE_FAILED('Failed to update master mandate'),
    );
  }

  private async updateUserSubscriptionExpiry(
    userId: string,
    subscriptionExpiry: Date,
    session?: ClientSession,
  ): Promise<void> {
    await this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionV1Model.updateOne(
        { userId },
        { $set: { subscriptionExpiry } },
        { session },
      ),
      Errors.USER_SUBSCRIPTION.UPDATE_FAILED(
        'Failed to update user subscription',
      ),
    );
    this.logger.log(
      { subscriptionExpiry, userId },
      `Successfully updated user subscription expiry`,
    );
  }

  async findSubscriptionsAboutToExpire(): Promise<string[]> {
    const SEVENTY_TWO_HOURS_FROM_NOW = addHours(new Date(), 72);

    const subscriptionsAboutToExpire =
      await this.userSubscriptionV1Repository.find({
        endAt: { $lte: SEVENTY_TWO_HOURS_FROM_NOW },
        subscriptionStatus: UserSubscriptionStatusV2.ACTIVE,
      });

    return (subscriptionsAboutToExpire ?? []).map(
      (subscription) => subscription.userId,
    );
  }

  async getAllSubscriptionHistoryCountOfUser(
    userId: string,
  ): Promise<{ count: number }> {
    const userSubscriptionHistories =
      await this.errorHandler.raiseErrorIfNullAsync(
        this.userSubscriptionHistoryRepository.find({ userId }, [], {
          lean: true,
        }),
        Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(),
      );
    return { count: userSubscriptionHistories.length ?? 0 };
  }

  async getLatestMandateStatus(
    userId: string,
    vendor: string,
    isRecurringSubscription: boolean,
  ): Promise<MappedMandateStatus> {
    if (!isRecurringSubscription) {
      return MandateStatusNotAvailableEnum.NOT_AVAILABLE;
    }

    switch (vendor) {
      case UserSubscriptionHistoryVendorEnum.PHONEPE:
      case UserSubscriptionHistoryVendorEnum.PAYTM:
        return await this.getMasterMandateStatus(userId);
      case UserSubscriptionHistoryVendorEnum.JUSPAY:
        return await this.getJuspayMandateStatus(userId);
      case UserSubscriptionHistoryVendorEnum.RAZORPAY:
        return await this.getRazorpayMandateStatus(userId);
      case UserSubscriptionHistoryVendorEnum.SETU:
        return await this.getSetuMandateStatus(userId);
      case UserSubscriptionHistoryVendorEnum.APPLE_PAY:
        return await this.getApplePayMandateStatus(userId);
      default:
        return MandateStatusNotAvailableEnum.NOT_AVAILABLE;
    }
  }

  async getLatestSubscriptionAndMandateStatus(
    userId: string,
  ): Promise<SubscriptionAndMandateStatusResponseDTO> {
    const userSubscription = await this.userSubscriptionV1Repository.findOne(
      { userId },
      ['_id'],
    );

    if (!userSubscription) {
      return {
        mandate_status: MandateStatusNotAvailableEnum.NOT_AVAILABLE,
        subscription_status: SubscriptionStatusEnum.NON_SUBSCRIBER,
      };
    }

    const latestSubscriptionDetails =
      await this.userSubscriptionHistoryRepository.findOne(
        { userId },
        [
          'status',
          'isTrial',
          'subscriptionValid',
          'vendor',
          'paymentGateway',
          'isRecurringSubscription',
          'createdAt',
        ],
        { sort: { createdAt: -1 } },
      );

    if (!latestSubscriptionDetails) {
      return {
        mandate_status: MandateStatusNotAvailableEnum.NOT_AVAILABLE,
        subscription_status: SubscriptionStatusEnum.NON_SUBSCRIBER,
      };
    }

    const {
      isRecurringSubscription = false,
      isTrial = false,
      vendor,
    } = latestSubscriptionDetails;

    const subscriptionStatus = this.mapLatestSubscriptionStatus({
      isTrial,
      status: latestSubscriptionDetails.status,
    });

    const mandateStatus = await this.getLatestMandateStatus(
      userId,
      vendor,
      isRecurringSubscription,
    );

    const trialDaysElapsed = isTrial
      ? differenceInDays(new Date(), latestSubscriptionDetails.createdAt)
      : undefined;

    return {
      mandate_status: mandateStatus,
      subscription_status: subscriptionStatus,
      subscription_valid: latestSubscriptionDetails.subscriptionValid,
      trial_days_elapsed: trialDaysElapsed,
    };
  }

  async getLatestSubscriptionHistoryForTvAdoption(
    userId: string,
    trialCheck: boolean,
  ): Promise<GetLatestSubscriptionHistoryResponse> {
    const latestUserSubscriptionHistory =
      await this.userSubscriptionHistoryRepository.findOne(
        {
          planId: {
            $nin: [
              APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
                .TV_ADOPTION_FREE_TRIAL_PLAN_ID,
              APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
                .TV_ADOPTION_FREE_SUBSCRIPTION_PLAN_ID,
            ],
          },
          status: UserSubscriptionHistoryStatusEnum.ACTIVE,
          userId,
        },
        [
          'actualPlanPrice',
          'actualPrice',
          'adid',
          'couponCode',
          'couponPartnerName',
          'couponStoreId',
          'couponStoreName',
          'createdAt',
          'currency',
          'currencySymbol',
          'deviceId',
          'dialect',
          'discount',
          'email',
          'gps_adid',
          'idfa',
          'isGlobal',
          'isRecommended',
          'isRecurring',
          'isRecurringSubscription',
          'isRenew',
          'isTrial',
          'isUpgrade',
          'itemId',
          'latest_receipt',
          'latest_receipt_info',
          'os',
          'partnerCustomerId',
          'pending_renewal_info',
          'platform',
          'playBillingPurchaseDetails',
          'playBillingVerificationData',
          'previousSubscription',
          'primaryMobileNumber',
          'providerId',
          'receipt',
          'recieptInfo',
          'remarks',
          'renewalRecurringCount',
          'saved',
          'status',
          'subscriptionDate',
          'subscriptionValid',
          'vendor',
        ],
        {
          lean: true,
          sort: { _id: -1 },
        },
      );

    if (!latestUserSubscriptionHistory) {
      return { giveTvAdoption: false, latestSubscriptionHistory: null };
    }

    const { isRecurringSubscription, isTrial, vendor } =
      latestUserSubscriptionHistory;
    if (!isTrial && trialCheck) {
      return {
        giveTvAdoption: false,
        latestSubscriptionHistory: latestUserSubscriptionHistory,
      };
    }

    const getLatestMandateStatusOfUser = await this.getLatestMandateStatus(
      userId,
      vendor,
      isRecurringSubscription ?? false,
    );
    if (
      getLatestMandateStatusOfUser !== MasterMandateStatusEnum.MANDATE_ACTIVE
    ) {
      return {
        giveTvAdoption: false,
        latestSubscriptionHistory: latestUserSubscriptionHistory,
      };
    }

    return {
      giveTvAdoption: true,
      latestSubscriptionHistory: latestUserSubscriptionHistory,
    };
  }

  async getSubscriptionDetails({
    userId,
  }: {
    userId: string;
  }): Promise<GetUserSubscriptionResponseDto> {
    const subscription = await this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionV1Repository.findOne(
        {
          userId,
        },
        ['subscriptionExpiry', 'subscriptionStatus', 'userId', 'isTrial'],
        { lean: true },
      ),
      Errors.SUBSCRIPTION.NOT_FOUND(),
    );

    const latestUserSubscriptionHistory =
      await this.errorHandler.raiseErrorIfNullAsync(
        this.userSubscriptionHistoryRepository.findOne(
          { userId },
          ['subscriptionDate', 'isTrial'],
          {
            lean: true,
            sort: { createdAt: -1 },
          },
        ),
        Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(),
      );

    const { isTrial, subscriptionDate } = latestUserSubscriptionHistory;

    return {
      ...subscription,
      isTrial: isTrial ?? false,
      subscriptionStart: subscriptionDate,
    };
  }

  async giveTvAdoptionToSubscriptionExtensionUser(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
  ): Promise<void> {
    const plan = await this.planRepository.findOne(
      {
        planId:
          APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
            .TV_ADOPTION_FREE_SUBSCRIPTION_PLAN_ID,
        status: PlanStatusEnum.ACTIVE,
      },
      [
        'planId',
        'totalDays',
        'planType',
        'planDays',
        'totalCount',
        'subscriptionDate',
        'subscriptionValid',
      ],
      { lean: true },
    );

    if (!plan) {
      throw Errors.PLAN.NOT_FOUND('Subscription extension plan not found');
    }

    const isTvAdoptionFreePlanGiven =
      await this.checkTvAdoptionFreePlanGiven(userId);
    if (isTvAdoptionFreePlanGiven) {
      this.logger.log(
        { userId },
        `User already has TV adoption free plan given`,
      );
      return;
    }

    if (!latestSubscriptionHistory.subscriptionValid) {
      throw Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(
        'Subscription valid date not found in subscription history',
      );
    }

    if (!latestSubscriptionHistory.subscriptionDate) {
      throw Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(
        'Subscription date not found in subscription history',
      );
    }

    const subscriptionValid = addDays(
      latestSubscriptionHistory.subscriptionValid,
      plan.totalDays,
    );
    const subscriptionDate = latestSubscriptionHistory.subscriptionDate;

    const subscriptionId = `cms_${randomUUID()}`;

    // Use MongoDB transaction to ensure all operations succeed or all fail
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(
        async () => {
          // First write operation: Create subscription history
          const newSubscriptionHistory =
            await this.createTvAdoptionSubscriptionHistoryOnMandateSuccess(
              userId,
              latestSubscriptionHistory,
              plan,
              subscriptionId,
              subscriptionDate,
              subscriptionValid,
              session,
            );
          // Second write operation: Update master mandate if it exists
          await this.updateMasterMandateForTvAdoption(
            userId,
            plan,
            newSubscriptionHistory?.updatedAt ?? new Date(),
            subscriptionValid,
            latestSubscriptionHistory.vendor,
            session,
          );

          // Third write operation: Update user subscription
          await this.updateUserSubscriptionExpiry(
            userId,
            subscriptionValid,
            session,
          );
        },
        {
          maxCommitTimeMS: 5000,
          readPreference: 'primary', // Transactions require primary read preference
        },
      );

      // Send subscription extended event to RudderStack and CleverTap (outside transaction)
      await this.sendSubscriptionExtendedEvent(
        userId,
        latestSubscriptionHistory,
        plan,
        subscriptionValid,
        subscriptionId,
      );
    } catch (error) {
      this.logger.error(
        { error, subscriptionId, userId },
        `Failed to complete TV adoption process - transaction rolled back`,
      );
      throw error;
    }
  }

  async giveTvAdoptionToTrialUser(
    userId: string,
    latestSubscriptionHistory: Partial<UserSubscriptionHistory>,
  ): Promise<void> {
    const plan = await this.planRepository.findOne(
      {
        planId:
          APP_CONFIGS.PLANS.TV_ADOPTION_FREE_PLANS
            .TV_ADOPTION_FREE_TRIAL_PLAN_ID,
        status: PlanStatusEnum.ACTIVE,
      },
      [
        'planId',
        'totalDays',
        'planType',
        'planDays',
        'totalCount',
        'subscriptionDate',
        'subscriptionValid',
      ],
      { lean: true },
    );

    if (!plan) {
      throw Errors.PLAN.NOT_FOUND('Plan not found');
    }

    const isTvAdoptionFreePlanGiven =
      await this.checkTvAdoptionFreePlanGiven(userId);
    if (isTvAdoptionFreePlanGiven) {
      return;
    }

    if (!latestSubscriptionHistory.subscriptionValid) {
      throw Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(
        'Subscription valid date not found in subscription history',
      );
    }

    if (!latestSubscriptionHistory.subscriptionDate) {
      throw Errors.SUBSCRIPTION.HISTORY_NOT_FOUND(
        'Subscription date not found in subscription history',
      );
    }

    const subscriptionValid = addDays(
      latestSubscriptionHistory.subscriptionValid,
      plan.totalDays,
    );
    const subscriptionDate = latestSubscriptionHistory.subscriptionDate;

    const subscriptionId = `cms_${randomUUID()}`;

    // Use MongoDB transaction to ensure all operations succeed or all fail
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(
        async () => {
          // First write operation: Create subscription history
          const newSubscriptionHistory =
            await this.createTvAdoptionSubscriptionHistory(
              userId,
              latestSubscriptionHistory,
              plan,
              subscriptionId,
              subscriptionDate,
              subscriptionValid,
              session,
            );

          // Second write operation: Update master mandate if it exists
          await this.updateMasterMandateForTvAdoption(
            userId,
            plan,
            newSubscriptionHistory?.updatedAt ?? new Date(),
            subscriptionValid,
            latestSubscriptionHistory.vendor,
            session,
          );

          // Third write operation: Update user subscription
          await this.updateUserSubscriptionExpiry(
            userId,
            subscriptionValid,
            session,
          );
        },
        {
          maxCommitTimeMS: 5000,
          readPreference: 'primary', // Transactions require primary read preference
        },
      );

      // Send trial extended event to RudderStack and CleverTap (outside transaction)
      await this.sendTrialExtendedEvent(
        userId,
        latestSubscriptionHistory,
        plan,
        subscriptionValid,
        subscriptionId,
      );
    } catch (error) {
      this.logger.error(
        { error, subscriptionId, userId },
        `Failed to complete TV adoption process - transaction rolled back`,
      );
      throw error;
    }
  }
}
