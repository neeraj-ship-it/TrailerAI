import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Document, Types } from 'mongoose';

import {
  MasterMandateStatusEnum,
  RecurringRefundStatus,
  userSubscriptionHistoryStatusEnum,
  userSubscriptionStatusEnum,
} from '@app/common/enums/common.enums';
import { ErrorHandlerService, Errors } from '@app/error-handler';

import { AdminUserRepository } from '../../adminUser/repositories/adminUser.repository';
import { GetTransactionDto } from '../dtos/getTransaction.request.dto';
import { RefundRequestDto } from '../dtos/refund.request.dto';
import { Refund } from '../entities/refund.entity';
import { RefundedByEnum } from '../enums/refundedBy.enum';
import { RefundParams } from '../interfaces/RefundParams.interface';
import { RefundRepository } from '../repositories/refund.repository';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { JuspayException } from '@app/common/exceptions/juspay.exception';
import { PaytmException } from '@app/common/exceptions/paytm.exception';
import { PhonePeException } from '@app/common/exceptions/phonepe.exception';
import { JuspayOrderRepository } from '@app/common/repositories/juspayOrders.repository';
import { MasterMandateRepository } from '@app/common/repositories/masterMandate.repository';
import { PlanRepository } from '@app/common/repositories/plan.repository';
import { RecurringTransactionRepository } from '@app/common/repositories/recurringTransaction.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { JuspayUtils } from '@app/common/utils/juspay.utils';
import { PaytmUtils } from '@app/common/utils/paytm.utils';
import { PhonePeUtils } from '@app/common/utils/phonepe.utils';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { NotificationKeys } from 'src/notification/interfaces/notificationPayload.interface';
import { NotificationDispatcher } from 'src/notification/services/notificationDispatcher.service';
import { UserSubscriptionService } from 'src/users/services/userSubscription.service';

export enum RefundErrorCodesEnum {
  PAYMENT_ERROR = 'PAYMENT_ERROR',
}

@Injectable()
export class RefundService {
  private logger = new Logger(RefundService.name);
  constructor(
    private readonly notificationDispatcher: NotificationDispatcher,
    @Inject() private readonly userRepository: UserRepository,
    @Inject()
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    @Inject() private readonly paytmUtils: PaytmUtils,
    @Inject() private readonly juspayUtils: JuspayUtils,
    @Inject() private readonly phonepeUtils: PhonePeUtils,
    @Inject()
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    @Inject() private readonly refundRepository: RefundRepository,
    @Inject() private readonly errorHandlerService: ErrorHandlerService,
    @Inject() private readonly adminUserRepository: AdminUserRepository,
    @Inject() private readonly masterMandateRepository: MasterMandateRepository,
    @Inject() private readonly juspayOrderRepository: JuspayOrderRepository,
    @Inject()
    private readonly userSubscriptionV1Repository: UserSubscriptionV1Repository,
    @Inject() private readonly planRepository: PlanRepository,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  private async calculateNextPlanPriceAndDays(
    firstTransaction: UserSubscriptionHistory,
  ): Promise<{
    nextPlanDays: string;
    nextPlanPayingPrice: number;
  }> {
    const { vendor } = firstTransaction;
    let nextPlan;
    // For Juspay, get planId from JuspayOrder
    if (vendor === PaymentGatewayEnum.JUSPAY) {
      const juspayOrder = await this.juspayOrderRepository.findOne(
        { user: new Types.ObjectId(firstTransaction.userId) },
        ['plan'],
        { sort: { createdAt: -1 } },
      );
      nextPlan = juspayOrder?.plan;
    }
    // For Paytm/Phonepe, get recurringPlanId from MasterMandate
    if (
      vendor === PaymentGatewayEnum.PAYTM ||
      vendor === PaymentGatewayEnum.PHONEPE
    ) {
      const mandate = await this.masterMandateRepository.findOne(
        { user: new Types.ObjectId(firstTransaction.userId) },
        ['recurringPlan'],
        { sort: { createdAt: -1 } },
      );
      nextPlan = mandate?.recurringPlan;
    }

    const nextPlanDetails = await this.planRepository.findOne(
      { _id: nextPlan },
      ['planDays', 'payingPrice'],
      { cache: { enabled: true }, lean: true },
    );

    if (!nextPlanDetails) {
      console.error('Failed to fetch next plan:', {
        userId: firstTransaction.userId,
      });
      return {
        nextPlanDays: 'NA',
        nextPlanPayingPrice: 0,
      };
    }

    return {
      nextPlanDays: nextPlanDetails.planDays,
      nextPlanPayingPrice: nextPlanDetails.payingPrice,
    };
  }

  private async canProcessRefund(): Promise<boolean> {
    const limit = 1000; // Refund limit for the day //FIXME: Move to constants

    const todaysRefundCountByAgent =
      await this.refundRepository.getTodaysAgentRefundsCount();

    // Check if the refund count exceeds the limit
    if (todaysRefundCountByAgent >= limit) {
      return false; // Disallow further refunds
    }

    return true; // Allow further refunds
  }

  private async createRefundTransaction(
    data: Omit<
      Refund,
      'createdAt' | 'updatedAt' | '__v' | '_id' | keyof Document
    >,
    mandateStatus: string,
  ) {
    const response = await this.refundRepository.create({
      ...data,
    });
    await this.updateMandateStatus({
      juspayOrderId: data?.juspayOrder,
      mandateStatus: mandateStatus,
      masterMandateId: data?.masterMandateId?.toString(),
      userId: data.user.toString(),
      vendor: data.vendor,
    });
    await this.removeUserSubscription({
      subscriptionId: data.subscriptionId,
      userId: data.user.toString(),
    });
    this.notificationDispatcher.dispatchNotification({
      key: NotificationKeys.SEND_REFUND_TRIGGER_NOTIFICATION,
      payload: {
        recipient: data.user._id.toString(),
      },
    });
    return response;
  }

  private async getOrderIdFromRecurringTransaction(txnId: string, pg: string) {
    const recurringTransaction =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.recurringTransactionRepository.findOne(
          { pgTxnId: txnId },
          ['orderId', 'referenceId'],
          { lean: true },
        ),
        Errors.REFUND.INVALID_TRANSACTION_ID(),
      );
    return pg === PaymentGatewayEnum.PAYTM
      ? recurringTransaction.orderId
      : recurringTransaction.referenceId;
  }

  private async getRefundInitiatedByUser(userId: string) {
    return this.errorHandlerService.raiseErrorIfNullAsync(
      this.adminUserRepository.findOne(
        new Types.ObjectId(userId),
        ['firstName', 'lastName'],
        { lean: true },
      ),
      Errors.REFUND.INVALID_AGENT(),
    );
  }

  private async getValidatedTransactionDetails(transactionId: string) {
    return this.errorHandlerService.raiseErrorIfNullAsync(
      this.userSubscriptionHistoryRepository.findOne({
        subscriptionId: transactionId,
      }),
      Errors.REFUND.INVALID_TRANSACTION_ID(),
    );
  }

  private async handleJuspayRefund(params: RefundParams) {
    const {
      juspayOrderId,
      order,
      payingPrice,
      reason,
      refundInitiatedBy,
      transactionId,
      userId,
    } = params;
    const refundInitiatedByUser =
      await this.getRefundInitiatedByUser(refundInitiatedBy);

    const response = await this.juspayUtils.refundTransaction(
      juspayOrderId,
      payingPrice,
    );
    if (!response.refunded) {
      throw new JuspayException({ response }, HttpStatus.BAD_REQUEST);
    }

    if (response.refunded && response.refunds && response.refunds.length > 0) {
      const refundStatus =
        response.refunds[0].status === 'SUCCESS'
          ? RecurringRefundStatus.REFUND_SUCCESSFUL
          : RecurringRefundStatus.REFUND_PENDING;

      return this.createRefundTransaction(
        {
          juspayOrder: order,
          pgTransactionId: transactionId,
          reason,
          refundAmount: payingPrice,
          refundedBy: RefundedByEnum.AGENT,
          refundInitiatedBy: new Types.ObjectId(refundInitiatedBy),
          refundInitiatedByUserName: `${refundInitiatedByUser.firstName} ${refundInitiatedByUser.lastName}`,
          refundStatus,
          refundStatusHistory: [
            { refundStatus, time: new Date() },
            {
              refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
              time: new Date(),
            },
          ],
          refundTransactionId: response.refunds[0].unique_request_id,
          subscriptionId: transactionId,
          user: new Types.ObjectId(userId),
          vendor: PaymentGatewayEnum.JUSPAY,
        },
        refundStatus,
      );
    }
  }

  private async handlePaytmRefund(params: RefundParams) {
    const {
      mandateOrderId,
      masterMandateId,
      payingPrice,
      reason,
      refundInitiatedBy,
      transactionId,
      userId,
    } = params;
    const refundInitiatedByUser =
      await this.getRefundInitiatedByUser(refundInitiatedBy);

    const txnId = transactionId.split('PAYTM_')[1];
    let orderId = mandateOrderId;
    if (!orderId) {
      orderId = await this.errorHandlerService.raiseErrorIfNullAsync(
        this.getOrderIdFromRecurringTransaction(
          txnId,
          PaymentGatewayEnum.PAYTM,
        ),
        Errors.REFUND.INVALID_TRANSACTION_ID(),
      );
    }
    const refId = `REFUND_REFID${orderId}`;

    const response = await this.paytmUtils.refundTransaction({
      orderId,
      refId,
      refundAmount: payingPrice,
      txnId,
    });

    if (!response.refunded) {
      throw new PaytmException({ response }, HttpStatus.BAD_REQUEST);
    } else if (response?.body?.resultInfo?.resultStatus === 'TXN_FAILURE') {
      this.logger.warn({ response }, 'Paytm refund failure');
      throw new PaytmException({ response }, HttpStatus.BAD_REQUEST);
    }

    const refundStatus =
      response?.body?.resultInfo?.resultStatus === 'TXN_SUCCESS'
        ? RecurringRefundStatus.REFUND_SUCCESSFUL
        : RecurringRefundStatus.REFUND_PENDING;

    const mandateStatus = MasterMandateStatusEnum.MANDATE_REFUNDED;

    return this.createRefundTransaction(
      {
        masterMandateId: new Types.ObjectId(masterMandateId),
        pgTransactionId: txnId,
        reason,
        refundAmount: payingPrice,
        refundedBy: RefundedByEnum.AGENT,
        refundInitiatedBy: new Types.ObjectId(refundInitiatedBy),
        refundInitiatedByUserName: `${refundInitiatedByUser.firstName} ${refundInitiatedByUser.lastName}`,
        refundStatus,
        refundStatusHistory: [
          { refundStatus, time: new Date() },
          {
            refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
            time: new Date(),
          },
        ],
        refundTransactionId: refId,
        subscriptionId: transactionId,
        user: new Types.ObjectId(userId),
        vendor: PaymentGatewayEnum.PAYTM,
      },
      mandateStatus,
    );
  }

  private async handlePhonePeRefund(params: RefundParams) {
    const {
      mandateOrderId,
      masterMandateId,
      payingPrice,
      reason,
      refundInitiatedBy,
      transactionId,
      userId,
    } = params;
    const refundInitiatedByUser =
      await this.getRefundInitiatedByUser(refundInitiatedBy);

    const pgTxnId = transactionId.split('PHONEPE_')[1];
    let orderId = mandateOrderId;
    if (!orderId) {
      orderId = await this.errorHandlerService.raiseErrorIfNullAsync(
        this.getOrderIdFromRecurringTransaction(
          pgTxnId,
          PaymentGatewayEnum.PHONEPE,
        ),
        Errors.REFUND.MANDATE_ORDER_ID_REQUIRED(),
      );
    }

    const response = await this.phonepeUtils.refundTransaction({
      amount: payingPrice,
      merchantOrderId: orderId,
      pgTxnId,
    });

    if (response.refundStatus === RecurringRefundStatus.REFUND_FAILED) {
      throw new PhonePeException({ response }, HttpStatus.BAD_REQUEST);
    } else if (response?.code == RefundErrorCodesEnum.PAYMENT_ERROR) {
      throw new PhonePeException(
        response?.data?.payResponseCode ?? response?.code,
        HttpStatus.BAD_REQUEST,
      );
    }

    const mandateStatus = MasterMandateStatusEnum.MANDATE_REFUNDED;
    return this.createRefundTransaction(
      {
        masterMandateId: new Types.ObjectId(masterMandateId),
        pgTransactionId: pgTxnId,
        reason,
        refundAmount: payingPrice,
        refundedBy: RefundedByEnum.AGENT,
        refundInitiatedBy: new Types.ObjectId(refundInitiatedBy),
        refundInitiatedByUserName: `${refundInitiatedByUser.firstName} ${refundInitiatedByUser.lastName}`,
        refundStatus: response.refundStatus,
        refundStatusHistory: [
          {
            refundStatus: response.refundStatus,
            time: new Date(),
          },
          {
            refundStatus: RecurringRefundStatus.REFUND_TRIGGERED,
            time: new Date(),
          },
        ],
        refundTransactionId: response.data.transactionId,
        subscriptionId: transactionId,
        user: new Types.ObjectId(userId),
        vendor: PaymentGatewayEnum.PHONEPE,
      },
      mandateStatus,
    );
  }

  private isWithinThreeDaysOfSubscription(createdAt: Date): boolean {
    // Work directly with UTC timestamps - normalize both dates to UTC midnight
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const createdAtUTC = new Date(
      Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    // Calculate difference in days
    const diffTime = todayUTC.getTime() - createdAtUTC.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 2;
  }

  private async removeUserSubscription({
    subscriptionId,
    userId,
  }: {
    userId: string;
    subscriptionId: string;
  }) {
    await this.userSubscriptionV1Repository.updateOne({
      filter: { userId },
      update: { subscriptionStatus: userSubscriptionStatusEnum.EXPIRED },
    });
    await this.userSubscriptionHistoryRepository.updateOne({
      filter: { subscriptionId },
      update: { status: userSubscriptionHistoryStatusEnum.REFUNDED },
    });
  }

  async getTransactions(payload: GetTransactionDto) {
    if (!payload.email && !payload.mobileNumber) {
      this.errorHandlerService.raiseErrorIfNull(
        null,
        Errors.USER.USER_INFO_REQUIRED(),
      );
    }
    const { email, mobileNumber } = payload;
    const userData = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findUserByEmailOrMobile({
        email: email,
        primaryMobileNumber: mobileNumber,
      }),
      Errors.USER.USER_NOT_FOUND(),
    );

    const transactions =
      await this.userSubscriptionHistoryRepository.getUserSubscriptionHistoryWithRefunds(
        userData._id.toString(),
      );

    if (!transactions || transactions.length === 0) {
      return {
        transactions: [],
      };
    }

    const latestTransaction = transactions[0];

    const { nextPlanDays, nextPlanPayingPrice } =
      await this.calculateNextPlanPriceAndDays(latestTransaction);

    const { mandate_status, subscription_status } =
      await this.userSubscriptionService.getLatestSubscriptionAndMandateStatus(
        latestTransaction.userId,
      );

    transactions[0].nextPlanDays = nextPlanDays;
    transactions[0].nextPlanPayingPrice = nextPlanPayingPrice;
    transactions[0].mandateStatus = mandate_status;
    transactions[0].subscriptionStatus = subscription_status;

    return {
      transactions: transactions.map((val, i) => ({
        ...val,
        isRefundable: i === 0 ? this.isRefundable(val) : false,
        nonRefundableReason: this.nonRefundReason(i, val),
      })),
    };
  }

  isRefundable({
    createdAt,
    payingPrice,
    refundStatus,
    vendor,
  }: {
    refundStatus?: string;
    payingPrice: number;
    createdAt: Date;
    vendor: PaymentGatewayEnum;
  }) {
    return (
      !refundStatus &&
      payingPrice > 1 &&
      this.isWithinThreeDaysOfSubscription(createdAt) &&
      [
        PaymentGatewayEnum.JUSPAY,
        PaymentGatewayEnum.PAYTM,
        PaymentGatewayEnum.PHONEPE,
      ].includes(vendor)
    );
  }

  nonRefundReason(
    i: number,
    {
      createdAt,
      payingPrice,
      refundStatus,
      vendor,
    }: {
      refundStatus?: string;
      payingPrice: number;
      createdAt: Date;
      vendor: PaymentGatewayEnum;
    },
  ) {
    if (i !== 0) return 'Only the latest transaction can be refunded';

    if (
      this.isRefundable({
        createdAt,
        payingPrice,
        refundStatus,
        vendor,
      })
    )
      return undefined;

    if (payingPrice <= 1) {
      return 'Paying price is less than minimum refundable limit';
    }

    if (
      ![
        PaymentGatewayEnum.JUSPAY,
        PaymentGatewayEnum.PAYTM,
        PaymentGatewayEnum.PHONEPE,
      ].includes(vendor)
    ) {
      return `Unsupported vendor ${vendor} for refund`;
    }

    if (!this.isWithinThreeDaysOfSubscription(createdAt)) {
      return 'Refund is only available within 3 days of subscription';
    }
    return refundStatus && refundStatus.length > 1
      ? 'Transaction already refunded or in progress'
      : 'something went wrong';
  }

  async refund(
    data: RefundRequestDto,
    refundInitiatedBy: string,
  ): Promise<Refund> {
    const canProcessRefund = await this.canProcessRefund();
    if (!canProcessRefund) {
      this.errorHandlerService.raiseErrorIfNull(
        null,
        Errors.REFUND.REFUND_FAILED('Refund limit exceeded for the day'),
      );
    }

    const transactionDetails = await this.getValidatedTransactionDetails(
      data.transactionId,
    );
    const {
      juspayOrderId,
      mandateOrderId,
      masterMandateId,
      order,
      payingPrice,
      userId,
      vendor,
    } = transactionDetails;

    const refundHandlers = {
      [PaymentGatewayEnum.JUSPAY]: this.handleJuspayRefund.bind(this),
      [PaymentGatewayEnum.PAYTM]: this.handlePaytmRefund.bind(this),
      [PaymentGatewayEnum.PHONEPE]: this.handlePhonePeRefund.bind(this),
    };

    const handler = refundHandlers[vendor as keyof typeof refundHandlers];
    this.errorHandlerService.raiseErrorIfNull(
      handler,
      Errors.REFUND.INVALID_TRANSACTION_ID(),
    );

    return handler({
      juspayOrderId,
      mandateOrderId,
      masterMandateId,
      order,
      payingPrice,
      reason: data.reason,
      refundInitiatedBy,
      transactionId: data.transactionId,
      userId,
    });
  }

  async updateMandateStatus({
    juspayOrderId,
    mandateStatus,
    masterMandateId,
    userId,
    vendor,
  }: {
    masterMandateId?: string;
    vendor: PaymentGatewayEnum;
    mandateStatus: string;
    userId: string;
    juspayOrderId?: Types.ObjectId;
  }) {
    if (
      masterMandateId &&
      (vendor == PaymentGatewayEnum.PAYTM ||
        vendor == PaymentGatewayEnum.PHONEPE)
    ) {
      return this.masterMandateRepository.markMandateRefunded(
        masterMandateId,
        mandateStatus,
      );
    }
    if (juspayOrderId && vendor == PaymentGatewayEnum.JUSPAY) {
      return this.juspayOrderRepository.markJuspayRefunded(
        userId,
        juspayOrderId,
        mandateStatus,
      );
    }
    return;
  }
}
