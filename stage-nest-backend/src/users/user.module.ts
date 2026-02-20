import { forwardRef, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core/router/router-module';
import { MongooseModule } from '@nestjs/mongoose';

import { ErrorHandlerModule } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

import { RmNumbersController } from './controllers/rmNumbers.controller';
import { RudderEventController } from './controllers/rudderEvent.controller';
import { UserController } from './controllers/user.controller';
import { UserSubscriptionController } from './controllers/userSubscription.controller';
import { UserService } from './services/user.service';
import { UserSubscriptionService } from './services/userSubscription.service';
import { User } from '@app/common/entities/user.entity';
import { UserCultures } from '@app/common/entities/userCultures.entity';

import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';

import { UserRepository } from '@app/common/repositories/user.repository';
import { UserCulturesRepository } from '@app/common/repositories/userCulture.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { EventsModule } from '@app/events';

import { UserSubscriptionV1Service } from '../shared/services/userSubscriptionV1.service';
import { UserSubscriptionV2Service } from '../shared/services/userSubscriptionV2.service';
import { TvAdoptionSubscriptionExtensionConsumerService } from './consumers/tvAdoptionSubscriptionExtension.consumer';
import { UserClickEventConsumerService } from './consumers/userClickEvent.consumer';
import { UserDownloadContentConsumer } from './consumers/userDownloadContent.consumer';
import { UserSubscriptionConsumer } from './consumers/userSubscription.consumer';
import { UserWatchConsumerService } from './consumers/userWatchData.consumer';
import { UserWatchListConsumerService } from './consumers/userWatchListData.consumer';
import { UserWatchedVideoConsumerService } from './consumers/userWatchedVideo.consumer';
import { UserWatchedVideoSecondaryConsumerService } from './consumers/userWatchedVideoTVadoption.consumer';
import { ExperimentController } from './controllers/experiment.controller';
import { RatingController } from './controllers/rating.controller';
import { UserAccountInviteController } from './controllers/userAccountInvite.controller';
import { UserProfileController } from './controllers/userProfile.controller';
import { ExperimentService } from './services/experiment.service';
import { RatingService } from './services/rating.service';
import { StatsigService } from './services/statsig.service';
import { UserAccountInviteService } from './services/userAccountInvite.service';
import { UserProfileService } from './services/userProfile.service';

import { ContentModule } from '../content/content.module';
import { UserEventService } from './services/userEvent.service';
import { WatchVideoService } from './services/watchVideo.service';
import { AuthModule } from '@app/auth';
import { AppRatingCategory } from '@app/common/entities/appRatingCategory.entity';
import { JuspayOrder } from '@app/common/entities/juspayOrders.entity';
import { MasterMandate } from '@app/common/entities/masterMandate.entity';
import { Orders } from '@app/common/entities/orders.entity';
import { Plan } from '@app/common/entities/plan.entity';
import { UserEvent } from '@app/common/entities/user.event';
import { UserInternalRating } from '@app/common/entities/userInternalRating.entity';
import { UserProfile } from '@app/common/entities/userProfile.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { UserWatchData } from '@app/common/entities/userWatchData.entity';
import { WatchVideoEvent } from '@app/common/entities/watchVideoEvent.entity';
import { AppRatingCategoryRepository } from '@app/common/repositories/appRatingCategory.repository';
import { JuspayOrderRepository } from '@app/common/repositories/juspayOrders.repository';
import { MasterMandateRepository } from '@app/common/repositories/masterMandate.repository';
import { OrdersRepository } from '@app/common/repositories/orders.repository';
import { PlanRepository } from '@app/common/repositories/plan.repository';
import { UserEventRepository } from '@app/common/repositories/userEvent.repository';
import { UserProfileRepository } from '@app/common/repositories/userProfile.repository';
import { UserRatingRepository } from '@app/common/repositories/userRating.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { UserWatchDataRepository } from '@app/common/repositories/userWatchData.repository';
import { WatchVideoEventRepository } from '@app/common/repositories/watchVideoEvent.repository';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { UserSubscriptionUtil } from '@app/common/utils/userSubscription.util';
import { RedisModule, RedisService } from '@app/redis';
import { SharedModule } from '@app/shared/shared.module';
import { UserEventSelfHostedRepository } from 'common/repositories/userEventSelfHosted.repository';
import { Episode } from 'src/content/entities/episodes.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';

import { UserTrialActivatedConsumer } from './consumers/userTrialActivated.consumer';
import { UserEventController } from './controllers/userEvent.controller';
import { UserDeviceRecordService } from './services/userDeviceRecord.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { UserAccountInvite } from '@app/common/entities/userAccountInvite.entity';
import { UserAccountInviteRepository } from '@app/common/repositories/userAccountInvite.repository';
import { UserDeviceRecord } from 'common/entities/userDeviceRecord.entity';
import { UserDeviceRecordRepository } from 'common/repositories/userDeviceRecord.repository';
import { UserContentStates } from 'src/content/entities/userSpecialAccess.entity';
import { UserSpecialStatesRepository } from 'src/content/repositories/userSpecialStates.repository';
@Module({
  controllers: [
    UserSubscriptionController,
    UserController,
    UserProfileController,
    RatingController,
    RudderEventController,
    ExperimentController,
    UserEventController,
    UserAccountInviteController,
    RmNumbersController,
  ],
  exports: [
    UserSubscriptionV1Service,
    UserSubscriptionService,
    UserRepository,
    UserProfileRepository,
    UserProfileService,
    UserAccountInviteService,
    RatingService,
    ExperimentService,
  ],
  imports: [
    AuthModule,
    forwardRef(() => ContentModule),
    ErrorHandlerModule,
    forwardRef(() => SharedModule),
    EventsModule,
    RouterModule.register([{ module: UserModule, path: 'users' }]),
    RepositoryCacheModule,
    RedisModule,
    MongooseModule.forFeature([
      createModelDefinition(UserSubscriptionV1),
      createModelDefinition(UserSubscriptionHistory),
      createModelDefinition(User),
      createModelDefinition(UserCultures),
      createModelDefinition(MasterMandate),
      createModelDefinition(JuspayOrder),
      createModelDefinition(Orders),
      createModelDefinition(Episode),
      createModelDefinition(UserWatchData),
      createModelDefinition(UserProfile),
      createModelDefinition(AppRatingCategory),
      createModelDefinition(UserInternalRating),
      createModelDefinition(UserEvent),
      createModelDefinition(UserDeviceRecord),
      createModelDefinition(UserAccountInvite),
      createModelDefinition(Plan),
      createModelDefinition(WatchVideoEvent),
      createModelDefinition(UserContentStates),
    ]),
    ...(APP_CONFIGS.MONGO_DB.EKS_URL
      ? [
          MongooseModule.forFeature(
            [createModelDefinition(UserEvent)],
            'secondary',
          ),
        ]
      : []),
  ],
  providers: [
    UserSubscriptionService,
    UserSubscriptionV1Repository,
    UserSubscriptionHistoryRepository,
    UserService,
    UserRepository,
    UserCulturesRepository,
    UserSubscriptionV2Service,
    UserSubscriptionV1Service,
    MasterMandateRepository,
    JuspayOrderRepository,
    OrdersRepository,
    PlanRepository,
    UserSpecialStatesRepository,
    UserDownloadContentConsumer,
    UserWatchListConsumerService,
    UserWatchedVideoConsumerService,
    UserWatchedVideoSecondaryConsumerService,
    TvAdoptionSubscriptionExtensionConsumerService,
    UserWatchConsumerService,
    UserClickEventConsumerService,
    NcantoUtils,
    EpisodesRepository,
    UserWatchDataRepository,
    UserSubscriptionConsumer,
    UserTrialActivatedConsumer,
    RedisService,
    UserProfileService,
    UserProfileRepository,
    UserSubscriptionUtil,
    StatsigService,
    ExperimentService,
    RatingService,
    AppRatingCategoryRepository,
    UserRatingRepository,
    UserEventRepository,
    ...(APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE
      ? [UserEventSelfHostedRepository]
      : []),
    UserEventService,
    UserDeviceRecordService,
    UserDeviceRecordRepository,
    UserAccountInviteService,
    UserAccountInviteRepository,
    WatchVideoEventRepository,
    WatchVideoService,
  ],
})
export class UserModule {}
