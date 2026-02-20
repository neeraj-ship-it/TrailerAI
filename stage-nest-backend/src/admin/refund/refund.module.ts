import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { AdminUserModule } from '../adminUser/adminUser.module';
import { AdminUser } from '../adminUser/entities/adminUser.entity';
import { AdminUserRepository } from '../adminUser/repositories/adminUser.repository';
import { AdminAuthService } from '../adminUser/services/adminAuth.service';
import { RefundController } from './controllers/refund.controller';
import { Refund } from './entities/refund.entity';
import { RefundRepository } from './repositories/refund.repository';
import { RefundService } from './services/refund.service';
import { CacheManagerModule } from '@app/cache-manager';
import { JuspayOrder } from '@app/common/entities/juspayOrders.entity';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { Plan } from '@app/common/entities/plan.entity';
import { RecurringTransaction } from '@app/common/entities/recurringTransaction.entity';
import { User } from '@app/common/entities/user.entity';
import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
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
import { ErrorHandlerService } from '@app/error-handler';
import {
  RepositoryCacheModule,
  RepositoryCacheService,
} from '@app/repository-cache';
import { createModelDefinition } from 'common/utils/mongoose.utils';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/users/user.module';

@Module({
  controllers: [RefundController],
  exports: [RefundService],
  imports: [
    NotificationModule,
    AdminUserModule,
    UserModule,
    CacheManagerModule,
    MongooseModule.forFeature([
      createModelDefinition(Refund),
      createModelDefinition(UserSubscriptionHistory),
      createModelDefinition(RecurringTransaction),
      createModelDefinition(AdminUser),
      createModelDefinition(MasterMandate),
      createModelDefinition(JuspayOrder),
      createModelDefinition(Plan),
      createModelDefinition(User),
      createModelDefinition(UserSubscriptionV1),
    ]),
  ],
  providers: [
    RefundService,
    UserRepository,
    UserSubscriptionHistoryRepository,
    PaytmUtils,
    JuspayUtils,
    PhonePeUtils,
    RecurringTransactionRepository,
    RefundRepository,
    ErrorHandlerService,
    AdminUserRepository,
    MasterMandateRepository,
    JuspayOrderRepository,
    PlanRepository,
    AdminUserRepository,
    RepositoryCacheModule,
    RepositoryCacheService,
    AdminAuthService,
    UserSubscriptionV1Repository,
  ],
})
export default class RefundModule {}
