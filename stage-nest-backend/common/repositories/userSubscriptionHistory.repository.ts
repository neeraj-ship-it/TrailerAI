import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserSubscriptionHistory } from '../entities/userSubscriptionHistory.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
@Injectable()
export class UserSubscriptionHistoryRepository extends BaseRepository<UserSubscriptionHistory> {
  constructor(
    @InjectModel(UserSubscriptionHistory.name)
    private userSubscriptionHistoryModel: Model<UserSubscriptionHistory>,
  ) {
    super(userSubscriptionHistoryModel);
  }
  async getStatsigSubscriptionData(userId: string) {
    const allSubscriptions = await this.find(
      { userId },
      [
        'status',
        'subscriptionValid',
        'subscriptionDate',
        'isTrial',
        'createdAt',
      ],
      { lean: true, sort: { createdAt: 1 } },
    );

    const subscriptions = allSubscriptions ?? [];
    const nonTrialSubscriptions = subscriptions.filter((sub) => !sub.isTrial);
    const trialSubscriptions = subscriptions.filter((sub) => sub.isTrial);

    const latestSubscription =
      nonTrialSubscriptions.length > 0
        ? nonTrialSubscriptions[nonTrialSubscriptions.length - 1]
        : null;
    const trialSubscription =
      trialSubscriptions.length > 0 ? trialSubscriptions[0] : null;
    const initialSubscription =
      subscriptions.length > 0 ? subscriptions[0] : null;
    const initialPaidSubscription =
      nonTrialSubscriptions.length > 0 ? nonTrialSubscriptions[0] : null;

    const paidSubscriptionAge = initialPaidSubscription?.subscriptionDate
      ? Math.floor(
          (new Date().getTime() -
            initialPaidSubscription.subscriptionDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : -1;
    const subscriptionAge = initialSubscription?.subscriptionDate
      ? Math.floor(
          (new Date().getTime() -
            initialSubscription.subscriptionDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : -1;

    return {
      initialPaidSubscription,
      initialSubscription,
      latestSubscription,
      paidSubscriptionAge,
      subscriptionAge,
      trialSubscription,
    };
  }

  async getUserSubscriptionHistoryWithRefunds(userId: string) {
    return this.userSubscriptionHistoryModel.aggregate([
      {
        $match: {
          userId,
          vendor: {
            $in: [
              PaymentGatewayEnum.PAYTM,
              PaymentGatewayEnum.PHONEPE,
              PaymentGatewayEnum.JUSPAY,
            ],
          },
        },
      },
      {
        $lookup: {
          as: 'refund',
          foreignField: 'subscriptionId',
          from: 'refunds',
          localField: 'subscriptionId',
        },
      },
      { $unwind: { path: '$refund', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          isRecurringSubscription: 1,
          payingPrice: 1,
          planDays: 1,
          refundAmount: '$refund.refundAmount',
          refundCreatedAt: '$refund.createdAt',
          refundInitiatedByUserName: '$refund.refundInitiatedByUserName',
          refundReason: '$refund.reason',
          refundStatus: '$refund.refundStatus',
          refundStatusHistory: '$refund.refundStatusHistory',
          refundTransactionId: '$refund.refundTransactionId',
          refundVendor: '$refund.vendor',
          subscriptionDate: 1,
          subscriptionId: 1,
          subscriptionValid: 1,
          userId: 1,
          vendor: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
  }
}
