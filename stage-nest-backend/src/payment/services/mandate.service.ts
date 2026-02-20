import { Injectable, Logger } from '@nestjs/common';

import { differenceInDays, isAfter, isBefore } from 'date-fns';

import {
  EntityManager,
  QueryOrder,
  Reference,
  Transactional,
} from '@mikro-orm/mongodb';

import { InjectQueue } from '@nestjs/bullmq';
import { bufferCount, mergeMap } from 'rxjs';

import { Queue } from 'bullmq';

import { MandateV2Repository } from '../../shared/repositories/mandateV2.repository';
import { CreateMandateRequestDTO } from '../dtos/requests/mandate.request.dto';
import { CreateMandateResponseDTO } from '../dtos/responses/mandate.response.dto';
import { MandateTransactionStatus } from '../entities/mandateTransactions.entity';

import { ObjectId } from '@mikro-orm/mongodb';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  RefundInitiatedBy,
  RefundStatus,
} from '../entities/mandateRefund.entity';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { PaymentGatewayManager } from '../managers/pg.manager';
import {
  SetuMandateWebhookExecuteOperationDto,
  SetuRefundWebhookPayloadDto,
  SetuWebhookPayloadDto,
} from '../psps/setu/dto/setu.webhook.dto';
import { MandateRefundRepository } from '../repositories/mandateRefund.repository';
import { MandateTransactionRepository } from '../repositories/mandateTransaction.repository';
import { WebhookPayloadRepository } from '../repositories/webhookPayload.repository';
import { Context } from '@app/auth';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { QUEUES } from '@app/common/constants/queues.const';
import { JuspayOrder } from '@app/common/entities/juspayOrders.entity';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { Orders } from '@app/common/entities/orders.entity';
import { PlanV2 } from '@app/common/entities/planV2.entity';
import { CurrencySymbolEnum } from '@app/common/enums/app.enum';
import { MasterMandateStatusEnum } from '@app/common/enums/common.enums';
import { addDaysToDate } from '@app/common/helpers/dateTime.helper';
import { QueuePayload } from '@app/common/interfaces/queuePayloads.interface';
import { PlanV2Repository } from '@app/common/repositories/planV2.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import { ActionSource, Events } from '@app/events/interfaces/events.interface';
import { PlanStatusEnum, PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { MandateNotificationStatusEnum } from '@app/shared/entities/mandateNotification.entity';
import { MandateV2 } from '@app/shared/entities/mandateV2.entity';
import {
  SubscriptionSource,
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from '@app/shared/entities/userSubscriptionV2.entity';
import { MandateNotificationRepository } from '@app/shared/repositories/mandateNotification.repository';
import { UserSubscriptionV2Repository } from '@app/shared/repositories/userSubscriptionV2.repository';
import { UserSubscriptionV1Service } from '@app/shared/services/userSubscriptionV1.service';
import { NotificationKeys } from 'src/notification/interfaces/notificationPayload.interface';
import { NotificationDispatcher } from 'src/notification/services/notificationDispatcher.service';

@Injectable()
export class MandateService {
  private readonly logger = new Logger(MandateService.name);
  constructor(
    private readonly mandateV2Repository: MandateV2Repository,
    private readonly paymentGatewayManager: PaymentGatewayManager,
    private readonly planV2Repository: PlanV2Repository,
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly mandateTransactionRepository: MandateTransactionRepository,
    private readonly userSubscriptionV2Repository: UserSubscriptionV2Repository,
    private readonly mandateNotificationRepository: MandateNotificationRepository,
    private readonly webhookPayloadRepository: WebhookPayloadRepository,
    private readonly mandateRefundRepository: MandateRefundRepository,
    private readonly userSubscriptionV1Service: UserSubscriptionV1Service,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly userSubscriptionV1Repository: UserSubscriptionV1Repository,
    private readonly em: EntityManager,
    private readonly notificationDispatcher: NotificationDispatcher,
    @InjectModel(MasterMandate.name)
    private readonly masterMandateModel: Model<MasterMandate>,
    @InjectModel(JuspayOrder.name)
    private readonly juspayOrderModel: Model<JuspayOrder>,
    @InjectModel(Orders.name) private readonly ordersModel: Model<Orders>,
    @InjectQueue(QUEUES.MANDATE_DEBIT_EXECUTION)
    private readonly mandateDebitNotificationsQueue: Queue<
      QueuePayload[QUEUES.MANDATE_DEBIT_EXECUTION]
    >,
    @InjectQueue(QUEUES.SUBSCRIPTION_CHECK)
    private readonly subscriptionCheckQueue: Queue<
      QueuePayload[QUEUES.SUBSCRIPTION_CHECK]
    >,
    private readonly eventsService: EventService,
  ) {}
  private getRemainingSubscriptionDays(endAt?: Date) {
    return endAt && isAfter(endAt, new Date())
      ? differenceInDays(endAt, new Date())
      : 0;
  }

  private isUserSubscriptionTrialPeriodActive({
    trial,
  }: Pick<UserSubscriptionV2, 'trial'>): boolean {
    return (
      isAfter(new Date(), trial.startAt) && isBefore(new Date(), trial.endAt)
    );
  }

  private isUserTrialPeriodOver({
    trialEndAt,
  }: {
    trialEndAt: Date | null;
  }): boolean {
    return !!(trialEndAt && isAfter(trialEndAt, new Date()));
  }

  async createMandate(
    createMandateRequest: CreateMandateRequestDTO,
    ctx: Context,
  ): Promise<CreateMandateResponseDTO> {
    const { paymentGateway } = createMandateRequest;
    // Check if user has already an active mandate. If yes, new mandate cannot be created

    const oldBackendSubscriptionInfo =
      await this.userSubscriptionV1Service.oldBackendSubscriptionInfo(
        ctx.user.id,
      );
    const {
      mandateActive: oldInfraMandateActive,
      trialTaken: oldInfraTrialTaken,
    } = oldBackendSubscriptionInfo;

    if (oldInfraMandateActive) {
      throw Errors.MANDATE.CREATION_FAILED(
        'Mandate cannot be created as user already has an active subscription and mandate',
      );
    }

    const [existingActiveMandate, chosenPlan, userSubscription] =
      await Promise.all([
        this.mandateV2Repository.findOne({
          status: MasterMandateStatusEnum.MANDATE_ACTIVE,
          userId: ctx.user.id,
        }),
        this.planV2Repository.findOneOrFail(
          {
            $or: [
              { derivedFrom: createMandateRequest.selectedPlan },
              { name: createMandateRequest.selectedPlan },
            ],
            status: PlanStatusEnum.ACTIVE,
          },
          {
            cache: true,
            failHandler: () =>
              Errors.PLAN.NOT_FOUND('Plan not found or not active'),
          },
        ),
        this.userSubscriptionV2Repository.findOne(
          {
            userId: ctx.user.id,
          },
          {
            // fields: ['trial', 'status', 'id'],
            orderBy: { createdAt: QueryOrder.DESC },
          },
        ),
      ]);

    // TODO: include old infra check
    if (
      existingActiveMandate &&
      userSubscription &&
      userSubscription.status === UserSubscriptionStatusV2.ACTIVE
    ) {
      throw Errors.MANDATE.CREATION_FAILED(
        'Mandate cannot be created as user already has an active subscription and mandate',
      );
    }

    let mandateCreationPrice =
      userSubscription &&
      this.isUserTrialPeriodOver({
        trialEndAt: userSubscription.trial?.endAt ?? null,
      })
        ? chosenPlan.pricing.netAmount
        : chosenPlan.pricing.trialAmount;

    // check old payment infra trial taken
    if (oldInfraTrialTaken) {
      mandateCreationPrice = chosenPlan.pricing.netAmount;
    }

    const newMandate = this.mandateV2Repository.create({
      creationAmount: mandateCreationPrice,
      expiresAt: addDaysToDate(
        new Date(),
        APP_CONFIGS.PLATFORM.DEFAULT_MANDATE_EXPIRY_DAYS,
      ),
      maxAmount: chosenPlan.pricing.netAmount,
      metadata: {
        appId: ctx.meta.appId ?? null,
        dialect: ctx.meta.dialect,
        os: ctx.meta.os,
        platform: ctx.meta.platform,
      },
      pg: paymentGateway,
      plan: Reference.create(chosenPlan),
      sequenceNumber: mandateCreationPrice === 0 ? 1 : 2, // when mandate creation amount is non-zero, sequence number is 2
      status: MasterMandateStatusEnum.MANDATE_INITIATED,
      statusHistory: [
        {
          status: MasterMandateStatusEnum.MANDATE_INITIATED,
          timestamp: new Date(),
        },
      ],
      userId: ctx.user.id,
    });

    const pgMandate = await this.paymentGatewayManager.createMandate(
      paymentGateway,
      {
        currency: chosenPlan.currency,
        endDate: newMandate.expiresAt,
        mandateCreationPrice: mandateCreationPrice,
        maxAmountLimit: chosenPlan.pricing.netAmount,
        paymentApp: createMandateRequest.paymentApp,
        stageMandateOrderId: newMandate.id,
        startDate: new Date(),
      },
    );
    await this.mandateV2Repository
      .getEntityManager()
      .persistAndFlush(newMandate);

    return {
      upiIntentLink: pgMandate.intentLink,
    };
  }

  async getLatestMandateStatus(userId: string) {
    const latestMandate = await this.mandateV2Repository.findOneOrFail(
      { userId },
      {
        failHandler: () =>
          Errors.MANDATE.NOT_FOUND('No latest mandate found for user'),
        orderBy: { createdAt: QueryOrder.DESC },
      },
    );

    return {
      status: latestMandate.status,
    };
  }

  /** This function is used to get the latest transaction status of a mandate,
   * which is used at the client side to show first txn status.
   * Don't modify this function without proper context.
   **/

  async getMandateLatestTransactionStatus(
    userId: string,
  ): Promise<{ txnStatus: MandateTransactionStatus; txnId?: string }> {
    const defaultTxnState = {
      txnStatus: MandateTransactionStatus.PENDING,
    };
    const latestMandate = await this.mandateV2Repository.findOneOrFail(
      { userId },
      {
        failHandler: () =>
          Errors.MANDATE.NOT_FOUND('No latest mandate found for user'),
        orderBy: { createdAt: QueryOrder.DESC },
      },
    );

    const latestTransaction = await this.mandateTransactionRepository.findOne(
      {
        mandate: new ObjectId(latestMandate.id),
      },
      {
        orderBy: { createdAt: QueryOrder.DESC },
      },
    );

    if (!latestTransaction) return defaultTxnState;

    return {
      txnId: latestTransaction.id,
      txnStatus: latestTransaction.txnStatus,
    };
  }

  @Transactional()
  async handleMandateActivation({
    amount,
    mandateId,
    pg,
    pgMandateId,
    pgResponse,
    status,
    umn,
    vendor,
  }: {
    amount: number;
    mandateId: string;
    pgMandateId: string;
    pgResponse: SetuWebhookPayloadDto;
    status: MasterMandateStatusEnum;
    pg: PaymentGatewayEnum;
    vendor: PaymentGatewayEnum;
    umn: string;
  }) {
    const mandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () =>
          Errors.MANDATE.NOT_FOUND(
            `Mandate not found for mandateId: ${mandateId}`,
          ),
        populate: ['plan'],
      },
    );
    const plan = mandate.plan.get();

    const webhookPayload = await this.webhookPayloadRepository.create({
      operation: pgResponse.eventType,
      pg,
      rawPayload: pgResponse,
    });
    await this.webhookPayloadRepository.save(webhookPayload);

    if (status === MasterMandateStatusEnum.MANDATE_FAILED) {
      mandate.status = status;
      await this.mandateTransactionRepository
        .getEntityManager()
        .persistAndFlush(
          this.mandateTransactionRepository.create({
            mandate: Reference.create(mandate),
            paymentId: null,
            pgTxnId: pgResponse.txnId,
            rawPayload: Reference.create(webhookPayload),
            txnAmount: amount,
            txnStatus: MandateTransactionStatus.FAILED,
          }),
        );
      this.notificationDispatcher.dispatchNotification({
        key: NotificationKeys.SEND_TRIAL_FAIL_NOTIFICATION,
        payload: {
          dialect: mandate.metadata.dialect,
          postTrialPrice: plan.pricing.netAmount,
          recipient: mandate.userId,
        },
      });
      return this.mandateV2Repository
        .getEntityManager()
        .persistAndFlush(mandate);
    }

    const userSubscription = await this.userSubscriptionV2Repository.findOne({
      userId: mandate.userId,
    });

    const mandateTxn = this.mandateTransactionRepository.create({
      mandate: Reference.create(mandate),
      paymentId: null,
      pgTxnId: pgResponse.txnId,
      rawPayload: Reference.create(webhookPayload),
      txnAmount: amount,
      txnStatus: MandateTransactionStatus.SUCCESS,
    });

    await this.mandateTransactionRepository
      .getEntityManager()
      .persistAndFlush(mandateTxn);

    // Update mandate status
    mandate.pgMandateId = pgMandateId;
    mandate.umn = umn;
    mandate.status = MasterMandateStatusEnum.MANDATE_ACTIVE;
    await this.mandateV2Repository.getEntityManager().persistAndFlush(mandate);

    let trialEndAt = new Date();

    // Create a new subscription if user does not have an active subscription.
    if (!userSubscription) {
      const oldBackendSubscriptionInfo =
        await this.userSubscriptionV1Service.oldBackendSubscriptionInfo(
          mandate.userId,
        ); // to support old infra

      const isTrial =
        !oldBackendSubscriptionInfo.trialTaken && plan.validity.trialDays > 0;
      this.logger.warn({ plan }, `DEBUG setu frequency issue`);
      const subscriptionEndData: Date = addDaysToDate(
        new Date(),
        isTrial ? plan.validity.trialDays : plan.validity.frequency,
      );
      const trialEndDate: Date =
        oldBackendSubscriptionInfo.trialTaken &&
        oldBackendSubscriptionInfo.trialEndDate
          ? oldBackendSubscriptionInfo.trialEndDate
          : addDaysToDate(new Date(), plan.validity.trialDays);

      const trialStartDate: Date =
        oldBackendSubscriptionInfo.trialTaken &&
        oldBackendSubscriptionInfo.trialStartDate
          ? oldBackendSubscriptionInfo.trialStartDate
          : new Date();

      trialEndAt = trialEndDate;

      // create subscription in both v1 and v2
      await Promise.all([
        this.userSubscriptionV2Repository.getEntityManager().persistAndFlush(
          this.userSubscriptionV2Repository.create({
            endAt: subscriptionEndData,
            lastTxn: mandateTxn._id,
            mandate: Reference.create(mandate),
            plan: Reference.create(plan),
            startAt: new Date(),
            status: UserSubscriptionStatusV2.ACTIVE,
            subscriptionHistory: [
              {
                endAt: subscriptionEndData,
                status: UserSubscriptionStatusV2.ACTIVE,
                triggerDate: new Date(),
                txn: mandateTxn._id.toString(),
              },
            ],
            subscriptionSource: SubscriptionSource.MANDATE,
            trial: {
              endAt: trialEndDate,
              startAt: trialStartDate,
            },
            userId: mandate.userId,
          }),
        ),
        this.userSubscriptionV1Service.backfillUserSubscription({
          actualPlanPrice: mandate.creationAmount,
          actualPrice: mandate.creationAmount,
          country: plan.country,
          currency: plan.currency,
          currencySymbol: CurrencySymbolEnum.INR,
          dialect: mandate.metadata.dialect,
          discount: 0,
          isGlobal: false,
          isTnplUser: true,
          isUpgrade: false,
          itemId: isTrial ? plan.trialPlanId : plan.name,
          os: mandate.metadata.os,
          payingPrice: mandate.creationAmount,
          paymentGateway: pg,
          planDays: isTrial
            ? plan.validity.trialDays.toString()
            : plan.validity.frequency.toString(),
          planId: isTrial ? plan.trialPlanId : plan.name,
          planType: isTrial ? PlanTypesEnum.WEEKLY : plan.validity.planType,
          platform: mandate.metadata.platform,
          remarks: [],
          saved: 0,
          status: UserSubscriptionStatusV2.ACTIVE,
          subscriptionDate: new Date(),
          subscriptionId: mandateTxn._id.toString(), // old backend is using txn id here and incorrectly named it subscription id in key
          subscriptionThrough: 'WEBHOOK',
          subscriptionValid: subscriptionEndData,
          userId: mandate.userId,
          vendor: vendor,
        }),
      ]);
    }

    if (userSubscription) {
      const planValidityDays = Number(mandate.plan.get().validity.frequency);
      // If user subscription is active, we need to add the remaining days to the new subscription in case new mandate is created
      const subscriptionEndAt = addDaysToDate(
        new Date(),
        userSubscription.status === UserSubscriptionStatusV2.ACTIVE
          ? planValidityDays +
              this.getRemainingSubscriptionDays(userSubscription.endAt)
          : planValidityDays,
      );

      userSubscription.plan = mandate.plan;
      userSubscription.startAt = new Date();

      userSubscription.endAt = subscriptionEndAt;
      userSubscription.mandate = Reference.create(mandate);
      userSubscription.status = UserSubscriptionStatusV2.ACTIVE;
      trialEndAt = userSubscription.trial.endAt;

      // Update user subscription
      await Promise.all([
        this.userSubscriptionV2Repository
          .getEntityManager()
          .persistAndFlush(userSubscription),
        this.userSubscriptionV1Service.backfillUserSubscription({
          actualPlanPrice: amount,
          actualPrice: amount,
          country: plan.country,
          currency: plan.currency,
          currencySymbol: CurrencySymbolEnum.INR,
          dialect: mandate.metadata.dialect,
          discount: 0,
          isGlobal: false,
          isTnplUser: true,
          isUpgrade: false,
          itemId: plan.name,
          os: mandate.metadata.os,
          payingPrice: amount,
          paymentGateway: pg,
          planDays: plan.validity.frequency.toString(),
          planId: plan.name,
          planType: plan.validity.planType,
          platform: mandate.metadata.platform,
          remarks: [],
          saved: 0,
          status: UserSubscriptionStatusV2.ACTIVE,
          subscriptionDate: new Date(),
          subscriptionId: mandateTxn._id.toString(), // old backend is using txn id here and incorrectly named it subscription id in key
          subscriptionThrough: 'WEBHOOK',
          subscriptionValid: userSubscription.endAt,
          userId: mandate.userId,
          vendor: vendor,
        }),
      ]);

      // Update mandate status to cancelled and started anew
      const previousMandate = await this.mandateV2Repository.findOne({
        _id: new ObjectId(userSubscription.mandate.id),
      });

      if (
        previousMandate &&
        previousMandate.status !== MasterMandateStatusEnum.MANDATE_ACTIVE
      ) {
        previousMandate.status =
          MasterMandateStatusEnum.MANDATE_CANCELLED_AND_STARTED_ANEW;
        await this.mandateV2Repository
          .getEntityManager()
          .persistAndFlush(previousMandate);
      }
    }

    const isTrial = this.isUserTrialPeriodOver({
      trialEndAt: trialEndAt,
    });

    if (!isTrial) {
      return;
    }

    // send trial activation notification
    this.notificationDispatcher.dispatchNotification({
      key: NotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION,
      payload: {
        dialect: mandate.metadata.dialect,
        postTrialMonths: plan.validity.frequency / 30, // devide by 30 to convert in months
        postTrialPrice: plan.pricing.netAmount,
        recipient: mandate.userId,
        trialDays: plan.validity.trialDays,
      },
    });
    const { _id, sequenceNumber, userId } = mandate;

    this.eventsService.trackEvent({
      app_client_id: mandate.metadata.appId,
      key: Events.TRIAL_ACTIVATED,
      os: mandate.metadata.os,
      payload: {
        dialect: mandate.metadata.dialect,
        mandate_id: _id.toString(),
        pgName: vendor,
        plan_id: plan.trialPlanId,
        platform: mandate?.metadata?.platform,
        sequence_number: sequenceNumber,
        status,
        txn_id: mandateTxn._id.toString(),
      },
      user_id: userId,
    });
  }

  @Transactional()
  async handleMandateDebit({
    amount,
    mandateId,
    pgResponse,
    status,
  }: {
    mandateId: string;
    amount: number;
    pgResponse: SetuMandateWebhookExecuteOperationDto;
    status: MandateTransactionStatus;
  }) {
    const mandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () => {
          const msg = `Mandate not found for mandateId:${mandateId}`;
          this.logger.error(msg);
          return Errors.MANDATE.NOT_FOUND(msg);
        },
        populate: ['plan'],
      },
    );
    const webhookPayload = this.webhookPayloadRepository.create({
      operation: pgResponse.eventType,
      pg: mandate.pg,
      rawPayload: pgResponse,
    });
    await this.webhookPayloadRepository.save(webhookPayload);

    const mandateTxn = await this.mandateTransactionRepository.create({
      mandate: Reference.create(mandate),
      paymentId: pgResponse?.payment?.paymentId ?? null,
      pgTxnId: pgResponse.txnId,
      rawPayload: Reference.create(webhookPayload),
      txnAmount: amount,
      txnStatus: status,
    });

    if (status === MandateTransactionStatus.FAILED) {
      this.logger.warn(
        `Mandate debit execution failed webhook received for mandateId:${mandate.id}`,
      );
      return this.mandateTransactionRepository
        .getEntityManager()
        .persistAndFlush(mandateTxn);
    }

    /**
     * If mandate transaction is successful, and mandate is active,
     * 1. Update mandate subscription endAt
     * 2. Update mandate status to active
     */
    if (mandate.status !== MasterMandateStatusEnum.MANDATE_ACTIVE) {
      // TODO: Ideally we should trigger auto-refund here
      return;
    }

    const userSubscription =
      await this.userSubscriptionV2Repository.findOneOrFail(
        {
          mandate: mandate._id,
        },
        {
          failHandler: () => {
            const msg = `Subscription not found for the mandateId: ${mandateId}`;
            this.logger.error(msg);
            return Errors.MANDATE.NOT_FOUND(msg);
          },
        },
      );
    const plan = mandate.plan.get();
    const isFirstExecution =
      plan.pricing.trialAmount !== 0 && pgResponse.seqNum == '1'; // mandate creation with non-zero amount webhook

    if (!isFirstExecution) {
      userSubscription.endAt = addDaysToDate(
        userSubscription.endAt,
        Number(plan.validity.frequency),
      );
      userSubscription.status = UserSubscriptionStatusV2.ACTIVE;
      userSubscription.lastTxn = mandateTxn._id;
      await this.userSubscriptionV2Repository
        .getEntityManager()
        .persistAndFlush(userSubscription);

      await this.userSubscriptionV1Service.backfillUserSubscription({
        actualPlanPrice: mandate.maxAmount,
        actualPrice: mandate.maxAmount,
        country: plan.country,
        currency: plan.currency,
        currencySymbol: CurrencySymbolEnum.INR,
        dialect: mandate.metadata.dialect,
        discount: 0,
        isGlobal: false,
        isTnplUser: true,
        isUpgrade: false,
        itemId: plan.name,
        os: mandate.metadata.os,
        payingPrice: mandate.maxAmount,
        paymentGateway: mandate.pg,
        planDays: plan.validity.frequency.toString(),
        planId: plan.name,
        planType: plan.validity.planType,
        platform: mandate.metadata.platform,
        remarks: [],
        saved: 0,
        status: UserSubscriptionStatusV2.ACTIVE,
        subscriptionDate: new Date(),
        subscriptionId: mandateTxn._id.toString(), // old backend is using txn id here and incorrectly named it subscription id in key
        subscriptionThrough: 'WEBHOOK',
        subscriptionValid: userSubscription.endAt,
        userId: mandate.userId,
        vendor: mandate.pg,
      });
      // send subscription success notification
      this.notificationDispatcher.dispatchNotification({
        key: NotificationKeys.SEND_SUBSCRIPTION_SUCCESS_NOTIFICATION,
        payload: {
          dialect: mandate.metadata.dialect,
          recipient: mandate.userId,
        },
      });
      this.eventsService.trackEvent({
        app_client_id: mandate.metadata.appId,
        key: Events.PAYMENT_SUCCESSFUL,
        os: mandate.metadata.os,
        payload: {
          pg_name: mandate.pg,
          plan_id: plan.name,
          txn_id: mandateTxn._id.toString(),
        },
        user_id: mandate.userId,
      });

      const isRenewed =
        (plan.pricing.trialAmount !== 0 && pgResponse.seqNum !== '2') ||
        (plan.pricing.trialAmount === 0 && pgResponse.seqNum !== '1');

      if (!isRenewed) {
        this.eventsService.trackEvent({
          app_client_id: mandate.metadata.appId,
          key: Events.SUBSCRIPTION_ACTIVATED,
          os: mandate.metadata.os,
          payload: {
            plan_id: plan.name,
            subscription_id: userSubscription._id.toString(),
            txn_id: mandateTxn._id.toString(),
          },
          user_id: mandate.userId,
        });
      } else {
        this.eventsService.trackEvent({
          app_client_id: mandate.metadata.appId,
          key: Events.SUBSCRIPTION_RENEWED,
          os: mandate.metadata.os,
          payload: {
            plan_id: plan.name,
            subscription_id: userSubscription._id.toString(),
          },
          user_id: mandate.userId,
        });
      }
    }

    if (isFirstExecution && amount !== plan.pricing.trialAmount) {
      this.eventsService.trackEvent({
        app_client_id: mandate.metadata.appId,
        key: Events.SUBSCRIPTION_RENEWED,
        os: mandate.metadata.os,
        payload: {
          plan_id: plan.name,
          subscription_id: userSubscription._id.toString(),
        },
        user_id: mandate.userId,
      });
    }

    return Promise.all([
      this.subscriptionCheckQueue.remove(userSubscription._id.toString()), // remove subscription removal task if still active
      this.userSubscriptionV1Service.updateUserSubscriptionStatus(
        mandate.userId,
        UserSubscriptionStatusV2.ACTIVE,
        userSubscription.endAt,
      ),
      this.mandateV2Repository.getEntityManager().persistAndFlush(mandate),
    ]);
  }

  @Transactional()
  async handleMandatePause({
    mandateId,
  }: {
    mandateId: string;
    pgMandateId: string;
  }) {
    const mandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () => Errors.MANDATE.NOT_FOUND('Mandate not found'),
      },
    );
    const userSubscription =
      await this.userSubscriptionV2Repository.findOneOrFail(
        {
          userId: mandate.userId,
        },
        {
          failHandler: () =>
            Errors.MANDATE.NOT_FOUND('Subscription not found for the mandate'),
        },
      );

    const plan = mandate.plan.unwrap();
    if (
      userSubscription.status === UserSubscriptionStatusV2.ACTIVE &&
      mandate.status === MasterMandateStatusEnum.MANDATE_ACTIVE
    ) {
      if (this.isUserSubscriptionTrialPeriodActive(userSubscription)) {
        userSubscription.status = UserSubscriptionStatusV2.CANCELLED;
        this.eventsService.trackEvent({
          app_client_id: mandate.metadata.appId,
          key: Events.SUBSCRIPTION_PAUSED,
          os: mandate.metadata.os,
          payload: {
            action_source: ActionSource.PSP,
            plan_id: plan.trialPlanId,
            subscription_id: userSubscription._id.toString(),
          },
          user_id: mandate.userId,
        });
        await this.userSubscriptionV2Repository
          .getEntityManager()
          .persistAndFlush(userSubscription);
      }

      mandate.status = MasterMandateStatusEnum.MANDATE_PAUSED_PSP;
      this.eventsService.trackEvent({
        app_client_id: mandate.metadata.appId,
        key: Events.MANDATE_PAUSED,
        os: mandate.metadata.os,
        payload: {
          action_source: ActionSource.PSP,
          mandate_id: mandateId,
          pg: mandate.pg,
          plan_id: this.isUserSubscriptionTrialPeriodActive(userSubscription)
            ? plan.trialPlanId
            : plan.name,
          platform: mandate?.metadata?.platform,
        },
        user_id: mandate.userId,
      });
      return this.mandateV2Repository
        .getEntityManager()
        .persistAndFlush(mandate);
    }
  }

  /*
   * Find source transaction entity, change its status to refunded
   * Find if refund transaction is already created, if not create one. Otherwise update the existing one
   * Attach payload to refund transaction
   * Attach refund transaction to source transaction
   */
  @Transactional()
  async handleMandateRefund({
    amount,
    paymentId,
    pgResponse,
  }: {
    mandateId: string;
    amount: number;
    paymentId: string;
    pgResponse: SetuRefundWebhookPayloadDto;
  }) {
    const sourceTxn = await this.mandateTransactionRepository.findOneOrFail(
      { paymentId },
      {
        failHandler: () =>
          Errors.MANDATE_TXN.NOT_FOUND('Previous transaction not found'),
      },
    );

    // Get or create refund entity
    const refundEntity =
      (await sourceTxn.refund?.load()) ??
      this.mandateRefundRepository.create({
        amount,
        initiator: RefundInitiatedBy.USER,
        mandateTxn: Reference.create(sourceTxn),
        rawPayload: null,
        reason: 'User initiated',
        refundedBy: RefundInitiatedBy.USER,
        refundTxnId: pgResponse.txnId,
        status: RefundStatus.REFUND_SUCCESS,
        statusHistory: [
          { status: RefundStatus.REFUND_SUCCESS, timestamp: new Date() },
        ],
        user: sourceTxn.mandate.unwrap().userId,
      });

    // Save initial refund entity
    await this.mandateRefundRepository
      .getEntityManager()
      .persistAndFlush(refundEntity);

    // Create webhook mapping and update entities
    const webhookPayload = this.webhookPayloadRepository.create({
      operation: pgResponse.eventType,
      pg: sourceTxn.mandate.unwrap().pg,
      rawPayload: pgResponse,
    });
    await this.webhookPayloadRepository.save(webhookPayload);

    // Update and save final state
    sourceTxn.txnStatus = MandateTransactionStatus.REFUNDED;
    refundEntity.rawPayload = Reference.create(webhookPayload);

    await Promise.all([
      this.mandateTransactionRepository
        .getEntityManager()
        .persistAndFlush(sourceTxn),
      this.mandateRefundRepository
        .getEntityManager()
        .persistAndFlush(refundEntity),
    ]);

    return refundEntity;
  }

  @Transactional()
  async handleMandateResume({ mandateId }: { mandateId: string }) {
    const currentMandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () => Errors.MANDATE.NOT_FOUND('Mandate not found'),
        // fields: ['id', 'status', 'userId'],
      },
    );

    const latestUserSubscription =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.userSubscriptionV2Repository.findLatestUserSubscription({
          userId: currentMandate.userId,
        }),
        Errors.MANDATE.NOT_FOUND('Subscription not found for the mandate'),
      );

    if (
      latestUserSubscription.mandate &&
      latestUserSubscription.mandate.id !== currentMandate.id
    ) {
      throw Errors.MANDATE.UPDATE_FAILED(
        'This mandate is not anymore in use. User has switched to a new mandate',
      );
    }

    if (
      ![
        MasterMandateStatusEnum.MANDATE_PAUSED,
        MasterMandateStatusEnum.MANDATE_PAUSED_IN_APP,
        MasterMandateStatusEnum.MANDATE_PAUSED_NO_APP_OPEN,
        MasterMandateStatusEnum.MANDATE_PAUSED_PSP,
      ].includes(currentMandate.status)
    ) {
      this.logger.debug(
        `Mandate is not in a valid state to be resumed. Current mandate status: ${currentMandate.status} which cannot be resumed`,
      );
      throw Errors.MANDATE.UPDATE_FAILED(
        `Mandate is not in a valid state to be resumed. Current mandate status: ${currentMandate.status} which cannot be resumed`,
      );
    }
    const plan = currentMandate.plan.unwrap();

    this.eventsService.trackEvent({
      app_client_id: currentMandate.metadata.appId,
      key: Events.MANDATE_RESUMED,
      os: currentMandate.metadata.os,
      payload: {
        action_source: ActionSource.PSP,
        mandate_id: mandateId,
        plan_id: this.isUserSubscriptionTrialPeriodActive(
          latestUserSubscription,
        )
          ? plan.trialPlanId
          : plan.name,
        platform: currentMandate?.metadata?.platform,
      },
      user_id: currentMandate.userId,
    });

    return this.errorHandlerService.try(
      async () => {
        currentMandate.status = MasterMandateStatusEnum.MANDATE_ACTIVE;
        await this.mandateV2Repository
          .getEntityManager()
          .persistAndFlush(currentMandate);

        if (this.isUserSubscriptionTrialPeriodActive(latestUserSubscription)) {
          latestUserSubscription.status = UserSubscriptionStatusV2.ACTIVE;
          this.eventsService.trackEvent({
            app_client_id: currentMandate.metadata.appId,
            key: Events.SUBSCRIPTION_RESUMED,
            os: currentMandate.metadata.os,
            payload: {
              action_source: ActionSource.PSP,
              plan_id: plan.trialPlanId,
              subscription_id: latestUserSubscription._id.toString(),
            },
            user_id: currentMandate.userId,
          });
          await this.userSubscriptionV2Repository
            .getEntityManager()
            .persistAndFlush(latestUserSubscription);
        }
      },
      async (e) => {
        this.logger.error(e);
        throw e;
      },
    );
  }

  @Transactional()
  async handleMandateRevoke({ mandateId }: { mandateId: string }) {
    const currentMandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () => Errors.MANDATE.NOT_FOUND('Mandate not found'),
        // fields: ['id', 'userId', 'status'],
      },
    );

    const userLatestSubscription =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.userSubscriptionV2Repository.findLatestUserSubscription({
          userId: currentMandate.userId,
        }),
        Errors.MANDATE.NOT_FOUND('Subscription not found for the mandate'),
      );

    if (
      userLatestSubscription.mandate &&
      userLatestSubscription.mandate.id !== currentMandate.id
    ) {
      throw Errors.MANDATE.UPDATE_FAILED(
        'This mandate is not anymore in use. User has switched to a new mandate',
      );
    }
    const plan = currentMandate.plan.unwrap();

    this.eventsService.trackEvent({
      app_client_id: currentMandate.metadata.appId,
      key: Events.MANDATE_REVOKED,
      os: currentMandate.metadata.os,
      payload: {
        action_source: ActionSource.PSP,
        mandate_id: mandateId,
        pg: currentMandate.pg,
        plan_id: this.isUserSubscriptionTrialPeriodActive(
          userLatestSubscription,
        )
          ? plan.trialPlanId
          : plan.name,
      },
      user_id: currentMandate.userId,
    });
    return this.errorHandlerService.try(
      async () => {
        currentMandate.status = MasterMandateStatusEnum.MANDATE_REVOKED_PSP;
        await this.mandateV2Repository
          .getEntityManager()
          .persistAndFlush(currentMandate);

        if (this.isUserSubscriptionTrialPeriodActive(userLatestSubscription)) {
          userLatestSubscription.status = UserSubscriptionStatusV2.CANCELLED;
          this.eventsService.trackEvent({
            app_client_id: currentMandate.metadata.appId,
            key: Events.SUBSCRIPTION_PAUSED,
            os: currentMandate.metadata.os,
            payload: {
              action_source: ActionSource.PSP,
              plan_id: plan.trialPlanId,
              subscription_id: userLatestSubscription._id.toString(),
            },
            user_id: currentMandate.userId,
          });
          await this.userSubscriptionV2Repository
            .getEntityManager()
            .persistAndFlush(userLatestSubscription);
        }
      },
      async (e) => {
        this.logger.error(e);
        throw e;
      },
    );
  }

  async sendMandatesForExecution() {
    let mandateExecutionCount = 0;
    this.logger.debug('Processing mandate debit execution');
    this.mandateNotificationRepository
      .findNotificationsReadyForExecution()
      .pipe(
        mergeMap(async (mandateNotification) => {
          const [mandate, attachedSubscription] = await Promise.all([
            this.mandateV2Repository
              .getEntityManager()
              .fork()
              .findOneOrFail(MandateV2, {
                _id: mandateNotification.mandate._id,
              }),
            this.userSubscriptionV2Repository
              .getEntityManager()
              .fork()
              .findOneOrFail(UserSubscriptionV2, {
                mandate: mandateNotification.mandate._id,
              }),
          ]);

          if (mandate.status !== MasterMandateStatusEnum.MANDATE_ACTIVE) {
            return false;
          }

          const plan = await this.planV2Repository
            .getEntityManager()
            .fork()
            .findOneOrFail(PlanV2, {
              _id: attachedSubscription.plan._id,
            });
          if (!mandate.pgMandateId) {
            this.logger.error(
              `The mandate with id: ${mandate.id} does not have a pgMandateId`,
            );
            return false;
          }
          await this.mandateDebitNotificationsQueue.add(
            QUEUES.MANDATE_DEBIT_EXECUTION,
            {
              amount: plan.pricing.netAmount,
              mandateId: mandate.id,
              pgMandateId: mandate.pgMandateId,
              userSubscriptionId: attachedSubscription.id,
            },
            { removeOnComplete: 1000 },
          );
          return true;
        }, 100), // Process 100 subscriptions concurrently to prevent overloading the database
      )
      .pipe(bufferCount(100))
      .subscribe((successList) => {
        successList.forEach((success) => {
          if (success) {
            mandateExecutionCount += 1;
          }
        });
        this.logger.log(
          `mandate debit execution trigger for batch size:${mandateExecutionCount}`,
        );
        mandateExecutionCount = 0;
      });
  }

  @Transactional()
  async toggleMandateStatus({ userId }: { userId: string }) {
    const userSubscription =
      await this.userSubscriptionV2Repository.findOneOrFail(
        { userId },
        {
          failHandler: () =>
            Errors.SUBSCRIPTION.NOT_FOUND('No subscription found'),
          populate: ['mandate'],
        },
      );
    if (!userSubscription.mandate) {
      throw Errors.SUBSCRIPTION.INVALID_STATE(
        'No mandate found for the subscription',
      );
    }
    const mandate = await this.mandateV2Repository.findOneOrFail(
      { _id: new ObjectId(userSubscription.mandate.id) },
      { failHandler: () => Errors.MANDATE.NOT_FOUND() },
    );
    const trialPeriodActive =
      this.isUserSubscriptionTrialPeriodActive(userSubscription);
    const plan = mandate.plan.unwrap();

    // Check if mandate is paused at PSP level
    if (mandate.status === MasterMandateStatusEnum.MANDATE_PAUSED_PSP) {
      throw Errors.SUBSCRIPTION.INVALID_STATE(
        'Mandate is paused at PSP side, we cannot resume the subscription from our end.',
      );
    }

    // Determine if we're pausing or resuming based on current mandate status
    const shouldMandateBePaused =
      mandate.status === MasterMandateStatusEnum.MANDATE_ACTIVE;

    if (shouldMandateBePaused) {
      // Pause flow
      if (userSubscription.status !== UserSubscriptionStatusV2.ACTIVE) {
        throw Errors.SUBSCRIPTION.INVALID_STATE(
          'Only active subscriptions can be paused',
        );
      }

      if (trialPeriodActive) {
        userSubscription.status = UserSubscriptionStatusV2.CANCELLED;
        this.eventsService.trackEvent({
          app_client_id: mandate.metadata.appId,
          key: Events.SUBSCRIPTION_PAUSED,
          os: mandate.metadata.os,
          payload: {
            action_source: ActionSource.APP,
            plan_id: plan.trialPlanId,
            subscription_id: userSubscription._id.toString(),
          },
          user_id: mandate.userId,
        });
        await this.userSubscriptionV2Repository
          .getEntityManager()
          .persistAndFlush(userSubscription);
      }

      mandate.status = MasterMandateStatusEnum.MANDATE_PAUSED_IN_APP;
      this.eventsService.trackEvent({
        app_client_id: mandate.metadata.appId,
        key: Events.MANDATE_PAUSED,
        os: mandate.metadata.os,
        payload: {
          action_source: ActionSource.APP,
          mandate_id: mandate._id.toString(),
          pg: mandate.pg,
          plan_id: trialPeriodActive ? plan.trialPlanId : plan.name,
          platform: mandate?.metadata?.platform,
        },
        user_id: mandate.userId,
      });
    } else {
      // Resume flow
      if (
        ![
          MasterMandateStatusEnum.MANDATE_PAUSED,
          MasterMandateStatusEnum.MANDATE_PAUSED_IN_APP,
          MasterMandateStatusEnum.MANDATE_PAUSED_NO_APP_OPEN,
        ].includes(mandate.status)
      ) {
        throw Errors.MANDATE.UPDATE_FAILED(
          `Invalid mandate state to resume: ${mandate.status.split('_').join(' ').toLowerCase()}`,
        );
      }

      // pause subscription if user is in trial period and paused/revoked mandate (business requirement)
      if (trialPeriodActive) {
        userSubscription.status = UserSubscriptionStatusV2.ACTIVE;
        this.eventsService.trackEvent({
          app_client_id: mandate.metadata.appId,
          key: Events.SUBSCRIPTION_RESUMED,
          os: mandate.metadata.os,
          payload: {
            action_source: ActionSource.APP,
            plan_id: plan.trialPlanId,
            subscription_id: userSubscription._id.toString(),
          },
          user_id: mandate.userId,
        });
        await this.userSubscriptionV2Repository
          .getEntityManager()
          .persistAndFlush(userSubscription);
      }

      mandate.status = MasterMandateStatusEnum.MANDATE_ACTIVE;
      this.eventsService.trackEvent({
        app_client_id: mandate.metadata.appId,
        key: Events.MANDATE_RESUMED,
        os: mandate.metadata.os,
        payload: {
          action_source: ActionSource.APP,
          mandate_id: mandate._id.toString(),
          plan_id: trialPeriodActive ? plan.trialPlanId : plan.name,
          platform: mandate?.metadata?.platform,
        },
        user_id: mandate.userId,
      });
    }
    return {
      status: mandate.status,
    };
  }

  @Transactional()
  async updateMandateNotificationStatus({
    mandateId,
    payload,
    pgNotificationId,
    status,
  }: {
    mandateId: string;
    pgNotificationId: string;
    status: MandateNotificationStatusEnum;
    payload: SetuWebhookPayloadDto;
  }) {
    const mandateNotification =
      await this.mandateNotificationRepository.findOneOrFail(
        {
          mandate: new ObjectId(mandateId),
          pgNotificationId,
        },
        {
          failHandler: () => {
            const msg = `Mandate notification not found for mandateId:${mandateId} & pgNotificationId:${pgNotificationId}`;
            this.logger.error(msg);
            return Errors.MANDATE_NOTIFICATION.NOT_FOUND(msg);
          },
        },
      );

    const mandate = await this.mandateV2Repository.findOneOrFail(
      {
        _id: new ObjectId(mandateId),
      },
      {
        failHandler: () => {
          const msg = `Mandate not found for mandateId:${mandateId} & pgNotificationId:${pgNotificationId} during mandate notification status update.`;
          this.logger.error(msg);
          return Errors.MANDATE.NOT_FOUND(msg);
        },
        populate: ['plan'],
      },
    );

    const webhookPayload = this.webhookPayloadRepository.create({
      operation: payload.eventType,
      pg: mandate.pg,
      rawPayload: payload,
    });
    await this.webhookPayloadRepository.save(webhookPayload);

    const plan = mandate.plan.get();
    if (status === MandateNotificationStatusEnum.FAILED) {
      this.logger.warn(
        `Setu failed notification webhook received for mandateId:${mandate._id.toString()}`,
      );
      mandate.sequenceNumber = mandate.sequenceNumber + 1; // if pre-debit notificatio fail, have to start new debit cycle
      await this.mandateV2Repository
        .getEntityManager()
        .persistAndFlush(mandate);
    }

    mandateNotification.status = status;
    mandateNotification.rawPayload = Reference.create(webhookPayload);

    if (status == MandateNotificationStatusEnum.SUCCESS) {
      this.notificationDispatcher.dispatchNotification({
        key: NotificationKeys.SEND_TRIAL_CONVERSION_NOTIFICATION,
        payload: {
          dialect: mandate.metadata.dialect,
          postTrialMonths: plan.validity.frequency / 30, // devide by 30 to convert in months
          postTrialPrice: plan.pricing.netAmount,
          recipient: mandate.userId,
          trialDays: plan.validity.trialDays,
        },
      });
    }
    return this.mandateNotificationRepository
      .getEntityManager()
      .persistAndFlush(mandateNotification);
  }
}
