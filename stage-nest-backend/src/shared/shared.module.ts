import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { OrdersRepository } from '../../common/repositories/orders.repository';
import { UserSubscriptionHistoryRepository } from '../../common/repositories/userSubscriptionHistory.repository';
import {
  MandateEntityChangeSubscriber,
  MandateV2,
} from './entities/mandateV2.entity';
import { UserSubscriptionV2 } from './entities/userSubscriptionV2.entity';
import { MandateNotificationRepository } from './repositories/mandateNotification.repository';
import { MandateV2Repository } from './repositories/mandateV2.repository';
import { TvDetailRepository } from './repositories/tvDetail.repository';
import { UserSubscriptionV2Repository } from './repositories/userSubscriptionV2.repository';
import { RmNumbersService } from './services/rmNumbers.service';
import { UserSubscriptionV1Service } from './services/userSubscriptionV1.service';
import { UserSubscriptionV2Service } from './services/userSubscriptionV2.service';
import { CacheManagerModule } from '@app/cache-manager';
import { JuspayOrder } from '@app/common/entities/juspayOrders.entity';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { Orders } from '@app/common/entities/orders.entity';
import { Setting } from '@app/common/entities/setting.entity';
import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { JuspayOrderRepository } from '@app/common/repositories/juspayOrders.repository';
import { MasterMandateRepository } from '@app/common/repositories/masterMandate.repository';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule } from '@app/error-handler';
import { EventsModule } from '@app/events';
import { RepositoryCacheModule } from '@app/repository-cache';
import { UserModule } from 'src/users/user.module';
@Module({
  exports: [
    MandateV2,
    UserSubscriptionV2,
    UserSubscriptionV2Repository,
    MandateV2Repository,
    MandateNotificationRepository,
    UserSubscriptionV2Repository,
    UserSubscriptionV1Service,
    UserSubscriptionV2Service,
    UserSubscriptionV1Repository,
    UserSubscriptionHistoryRepository,
    MasterMandateRepository,
    JuspayOrderRepository,
    OrdersRepository,
    TvDetailRepository,
    RmNumbersService,
  ],
  imports: [
    EventsModule,
    UserModule,
    RepositoryCacheModule,
    ErrorHandlerModule,
    CacheManagerModule,
    MongooseModule.forFeature([
      createModelDefinition(UserSubscriptionV1),
      createModelDefinition(UserSubscriptionHistory),
      createModelDefinition(MasterMandate),
      createModelDefinition(JuspayOrder),
      createModelDefinition(Orders),
      createModelDefinition(Setting),
    ]),
  ],
  providers: [
    MandateV2,
    UserSubscriptionV2,
    UserSubscriptionV2Repository,
    MandateV2Repository,
    MandateNotificationRepository,
    MandateEntityChangeSubscriber,
    UserSubscriptionV1Service,
    UserSubscriptionV2Service,
    UserSubscriptionV1Repository,
    UserSubscriptionHistoryRepository,
    MasterMandateRepository,
    JuspayOrderRepository,
    OrdersRepository,
    TvDetailRepository,
    RmNumbersService,
    SettingRepository,
  ],
})
export class SharedModule {}
