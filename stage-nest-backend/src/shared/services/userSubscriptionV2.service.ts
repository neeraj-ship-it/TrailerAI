import { Injectable } from '@nestjs/common';

import { Observable } from 'rxjs';

import { addHours } from 'date-fns';

import { ObjectId, Reference } from '@mikro-orm/mongodb';

import {
  GetUserSubscriptionV2DetailsResponseDto,
  GetUserSubscriptionV2StatusResponseDto,
} from '../../users/dtos/userSubscriptionV2.dto';
import { UserSubscriptionV1Service } from './userSubscriptionV1.service';
import { PlanV2 } from '@app/common/entities/planV2.entity';
import { User } from '@app/common/entities/user.entity';
import {
  CurrencyEnum,
  Dialect,
  OS,
  Platform,
} from '@app/common/enums/app.enum';
import { CurrencySymbolEnum } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ApplePayTransactions } from '@app/payment/entities/applePayTransactions.entity';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { ApplePayTransactionPayload } from '@app/payment/interfaces/applePay.interface';
import {
  SubscriptionSource,
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from 'src/shared/entities/userSubscriptionV2.entity';
import { UserSubscriptionV2Repository } from 'src/shared/repositories/userSubscriptionV2.repository';

@Injectable()
export class UserSubscriptionV2Service {
  constructor(
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly userSubscriptionV1Service: UserSubscriptionV1Service,
  ) {}

  async createSubscriptionThroughApplePay({
    plan,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rawTxnData,
    subscriptionEndDate,
    subscriptionThrough,
    trialEndDate,
    txn,
    user,
  }: {
    subscriptionEndDate: Date;
    subscriptionThrough: 'WEBHOOK';
    trialEndDate: Date;
    txn: ApplePayTransactions;
    user: User;
    plan: PlanV2;
    rawTxnData: ApplePayTransactionPayload;
  }) {
    const isTrial = txn.txnAmount === 0;
    const newUserSubscription = this.userSubscriptionV2Repository.create({
      endAt: subscriptionEndDate,
      lastTxn: txn._id,
      mandate: new ObjectId(),
      plan: Reference.create(plan),
      startAt: new Date(),
      status: UserSubscriptionStatusV2.ACTIVE,
      subscriptionHistory: [
        {
          endAt: subscriptionEndDate,
          status: UserSubscriptionStatusV2.ACTIVE,
          subscriptionSource: SubscriptionSource.APPLE_PAY,
          triggerDate: new Date(),
          txn: txn._id.toString(),
        },
      ],
      subscriptionSource: SubscriptionSource.APPLE_PAY,
      trial: {
        endAt: trialEndDate,
        startAt: new Date(),
      },
      userId: user._id.toString(),
    });

    await Promise.all([
      this.userSubscriptionV2Repository
        .getEntityManager()
        .persistAndFlush(newUserSubscription),

      this.userSubscriptionV1Service.backfillUserSubscription({
        actualPlanPrice: txn.txnAmount,
        actualPrice: txn.txnAmount,
        country: plan.country,
        currency: txn.txnCurrency,
        currencySymbol:
          txn.txnCurrency == CurrencyEnum.INR
            ? CurrencySymbolEnum.INR
            : CurrencySymbolEnum.USD,
        dialect: user.userCulture ?? Dialect.HAR,
        discount: 0,
        isGlobal: txn.txnCurrency != CurrencyEnum.INR,
        isTnplUser: true,
        isUpgrade: false,
        itemId: isTrial ? plan.trialPlanId : plan.name,
        os: OS.IOS,
        payingPrice: txn.txnAmount,
        paymentGateway: PaymentGatewayEnum.APPLE_PAY,
        planDays: isTrial
          ? plan.validity.trialDays.toString()
          : plan.validity.frequency.toString(),
        planId: isTrial ? plan.trialPlanId : plan.name,
        planType: isTrial ? PlanTypesEnum.WEEKLY : plan.validity.planType,
        platform: Platform.APP,
        // receiptInfo: {
        //   version: 2,
        //   ...rawTxnData,
        // }, // TODO: why is this needed?
        remarks: [],
        saved: 0,
        status: UserSubscriptionStatusV2.ACTIVE,
        subscriptionDate: new Date(),
        subscriptionId: txn._id.toString(),
        subscriptionThrough: subscriptionThrough,
        subscriptionValid: subscriptionEndDate,
        userId: user._id.toString(),
        vendor: PaymentGatewayEnum.APPLE_PAY,
      }),
    ]);

    return newUserSubscription;
  }

  findSubscriptionsAboutToExpire(): Observable<UserSubscriptionV2> {
    const SEVENTY_TWO_HOURS_FROM_NOW = addHours(new Date(), 72);

    return this.userSubscriptionV2Repository.findSubscriptionsAboutToExpire({
      batchSize: 1000,
      expireAt: SEVENTY_TWO_HOURS_FROM_NOW,
    });
  }

  async getSubscriptionDetails({
    userId,
  }: {
    userId: string;
  }): Promise<GetUserSubscriptionV2DetailsResponseDto> {
    const subscription = await this.errorHandler.raiseErrorIfNullAsync(
      this.userSubscriptionV2Repository.findLatestUserSubscription({ userId }),
      Errors.SUBSCRIPTION.NOT_FOUND(),
    );

    return { ...subscription };
  }

  async getSubscriptionStatus({
    userId,
  }: {
    userId: string;
  }): Promise<GetUserSubscriptionV2StatusResponseDto> {
    const subscription = await this.userSubscriptionV2Repository.findOne({
      userId,
    });

    return { status: !subscription ? 'no_subscription' : subscription.status };
  }
}
