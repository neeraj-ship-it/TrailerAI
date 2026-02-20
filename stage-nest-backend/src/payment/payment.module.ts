import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '@app/auth';
import { RepositoryCacheModule } from '@app/repository-cache';

import { DisputeController } from './controllers/dispute.controller';
import { MandateController } from './controllers/mandate.controller';
import { PaymentOptionsController } from './controllers/paymentOptions.controller';
import { WebhookController } from './controllers/pspWebhook.controller';
import { UpiController } from './controllers/upi.controller';
import { Coupon } from './entities/coupon.entity';
import { Dispute } from './entities/dispute.entity';
import { MandateTransactions } from './entities/mandateTransactions.entity';
import { PaymentGatewayManager } from './managers/pg.manager';
import { PGWebhookManager } from './managers/pgWebhook.manager';
import { SetuGatewayAdapter } from './psps/setu/adapter.setu';
import { SetuWebhookParser } from './psps/setu/webhookParser.setu';
import { CouponRepository } from './repositories/coupon.repository';
import { DisputeRepository } from './repositories/dispute.repository';
import { MandateTransactionRepository } from './repositories/mandateTransaction.repository';
import { PlanRepository } from './repositories/plan.repository';
import { DisputeService } from './services/dispute.service';
import { DisputeHelperService } from './services/disputeHelper.service';
import { JuspayUpiService } from './services/juspayUpi.service';
import { MandateService } from './services/mandate.service';
import { PaymentOptionsService } from './services/paymentOptions.service';
import { PaytmService } from './services/paytm.service';
import { RazorpayService } from './services/razorpay.service';
import { UpiService } from './services/upi.service';

import { BullModule } from '@nestjs/bullmq';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { PaymentAlertsService } from './services/alerts.service';
import { PaymentConsumer } from './workers/payment.worker';
import { QUEUES } from '@app/common/constants/queues.const';
import { MandateOrder } from '@app/common/entities/mandateOrder.enitity';
import { MandateOrderRepository } from '@app/common/repositories/mandateOrder.repository';

import { ApplePayController } from './controllers/applePay.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { ApplePayService } from './psps/applePay/applePay.service';
import { ApplePayTransactionsRepository } from './repositories/applePayTransactions.repository';
import { MandateRefundRepository } from './repositories/mandateRefund.repository';
import { WebhookPayloadRepository } from './repositories/webhookPayload.repository';
import { InvoiceService } from './services/invoice.service';
import { MandateNotificationService } from './services/mandateNotification.service';
import { UserSubscriptionV2Service } from './services/userSubscription.service';
import { HandleMandateDebitWorker } from './workers/debitExecutionHandler.worker';
import { HandleDebitNotificationWorker } from './workers/debitNotificationHandler.worker';
import { MandateNotificationCheckWorker } from './workers/mandateNotificationCheck.worker';
import { PaymentJobDispatcher } from './workers/payment-dispatcher.service';
import { SubscriptionCheckWorker } from './workers/subscriptionHandler.worker';
import { CacheManagerModule } from '@app/cache-manager';
import { JuspayOrder } from '@app/common/entities/juspayOrders.entity';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { Orders } from '@app/common/entities/orders.entity';
import { Plan } from '@app/common/entities/plan.entity';
import { PlanV2 } from '@app/common/entities/planV2.entity';
import { Setting } from '@app/common/entities/setting.entity';
import { PlanV2Repository } from '@app/common/repositories/planV2.repository';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule } from '@app/error-handler';
import { EventsModule } from '@app/events';
import { SharedModule } from '@app/shared/shared.module';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/users/user.module';

@Module({
  controllers: [
    PaymentOptionsController,
    DisputeController,
    UpiController,
    MandateController,
    WebhookController,
    ApplePayController,
    InvoiceController,
  ],
  exports: [PaymentJobDispatcher],
  imports: [
    SharedModule,
    BullModule.registerQueue(
      {
        name: QUEUES.PAYMENTS,
      },
      {
        name: QUEUES.MANDATE_DEBIT_NOTIFICATIONS,
      },
      {
        name: QUEUES.MANDATE_DEBIT_EXECUTION,
      },
      {
        name: QUEUES.MANDATE_NOTIFICATION_CHECK,
      },
      {
        name: QUEUES.SUBSCRIPTION_CHECK,
      },
    ),
    RouterModule.register([
      {
        module: PaymentModule,
        path: 'payments',
      },
    ]),
    AuthModule,
    MongooseModule.forFeature([
      createModelDefinition(Dispute),
      createModelDefinition(MandateOrder),
      createModelDefinition(Coupon),
      createModelDefinition(Plan),
      createModelDefinition(MasterMandate),
      createModelDefinition(JuspayOrder),
      createModelDefinition(Orders),
      createModelDefinition(Setting),
    ]),
    MikroOrmModule.forFeature({ entities: [PlanV2, MandateTransactions] }),
    ErrorHandlerModule,
    RepositoryCacheModule,
    NotificationModule,
    UserModule,
    CacheManagerModule,
    EventsModule,
  ],
  providers: [
    PaymentOptionsService,
    CouponRepository,
    DisputeService,
    DisputeHelperService,
    JuspayUpiService,
    PaytmService,
    RazorpayService,
    UpiService,
    DisputeRepository,
    MandateOrderRepository,
    PaymentConsumer,
    PaymentAlertsService,
    MandateService,
    PaymentGatewayManager,
    SetuGatewayAdapter,
    SetuWebhookParser,
    MandateService,
    SetuGatewayAdapter,
    PlanRepository,
    PlanV2Repository,
    SettingRepository,
    PGWebhookManager,
    MandateTransactionRepository,
    HandleDebitNotificationWorker,
    HandleMandateDebitWorker,
    SubscriptionCheckWorker,
    UserSubscriptionV2Service,
    PaymentAlertsService,
    MandateNotificationService,
    MandateNotificationCheckWorker,
    MandateRefundRepository,
    PaymentJobDispatcher,
    WebhookPayloadRepository,
    ApplePayService,
    ApplePayTransactionsRepository,
    InvoiceService,
  ],
})
export class PaymentModule {}
