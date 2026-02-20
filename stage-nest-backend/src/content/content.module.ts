import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RouterModule } from '@nestjs/core';

import { BullModule } from '@nestjs/bullmq';

import { AppsflyerDeeplink } from '../../common/entities/appsflyerDeeplink.entity';
import { DeepLinkHelper } from '../../common/helpers/deepLink.helper';
import { AppsflyerDeeplinkRepository } from '../../common/repositories/appsflyerDeeplink.repository';
import { ContentMetadataConsumerService } from './consumers/contentMetadata.consumer';
import { WatchListMigrationConsumer } from './consumers/watchlistMigration.consumer';
import { ContentOnboardingController } from './controllers/contentOnboarding.controller';
import { ContentProfileController } from './controllers/contentProfile.controller';
import { ContentController } from './controllers/contents.controller';
import { DeepLinkController } from './controllers/deeplink.controller';
import { MovieController } from './controllers/movies.controller';
import { RecommendationController } from './controllers/recommendation.controller';
import { ReelsController } from './controllers/reels.controller';
import { ShowsController } from './controllers/shows.controllers';
import { SignedUrlController } from './controllers/signedUrl.controller';
import { SpecialAccessController } from './controllers/specialAccess.controller';
import { ContentCategoryOnboardingMapping } from './entities/contentCategoryOnboardingMapping.entity';
import { ContentOnboardingCategory } from './entities/contentOnboardingCategory.entity';
import { ContentProfile } from './entities/contentProfile.entity';
import { Season } from './entities/season.entity';
import { UpcomingSection } from './entities/upcomingSection.entity';
import { UserOnboardingPreference } from './entities/userOnboardingPreference.entity';
import { UserOnboardingState } from './entities/userOnboardingState.entity';
import { UserContentStates } from './entities/userSpecialAccess.entity';
import { AssetsV2Repository } from './repositories/assetsV2.repository';
import { ContentAssetsRepository } from './repositories/contentAssets.repository';
import { ContentCategoryOnboardingMappingRepository } from './repositories/contentCategoryOnboardingMapping.repository';
import { ContentOnboardingCategoryRepository } from './repositories/contentOnboardingCategory.repository';
import { ContentProfileRepository } from './repositories/contentProfile.repository';
import { EpisodesRepository } from './repositories/episode.repository';
import { MicroDramaInteractionRepository } from './repositories/microDramaInteraction.repository';
import { ReelRepository } from './repositories/reel.repository';
import { ReelActionRepository } from './repositories/reelAction.repository';
import { SeasonsRepository } from './repositories/season.repository';
import { UpcomingSectionRepository } from './repositories/upcomingSection.repository';
import { UserOnboardingPreferenceRepository } from './repositories/userOnboardingPreference.repository';
import { UserOnboardingStateRepository } from './repositories/userOnboardingState.repository';
import { UserSpecialStatesRepository } from './repositories/userSpecialStates.repository';
import { DeepLinkService } from './services/appsflyer.service';
import { ContentService } from './services/content.services';
import { ContentProfileService } from './services/contentProfile.service';
import { MovieService } from './services/movies.service';
import { OnboardingSeedService } from './services/onboarding-seed.service';
import { OnboardingService } from './services/onboarding.service';
import { RecommendationService } from './services/recommendation.service';
import { ReelsRecommendationService } from './services/reel-recommendation.service';
import { ReelsService } from './services/reels.service';
import { ShowsService } from './services/shows.services';
import { SignedUrlService } from './services/signedUrl.service';
import { SpecialAccessService } from './services/specialAccess.service';
import { ContentJobDispatcher } from './workers/content-dispatcher.service';
import { ContentHandlerWorker } from './workers/contentHandler.worker';
import { AuthModule } from '@app/auth';
import { CacheManagerModule } from '@app/cache-manager';
import { GenreRepository } from '@app/cms/repositories/genre.repository';
import { ReelRepository as CmsReelRepository } from '@app/cms/repositories/reel.repository';
import { AirbyteRecommendation } from '@app/common/entities/airbyte-recommendation.entity';
import { AssetsV2 } from '@app/common/entities/assetsV2.entity';
import { ContentAssets } from '@app/common/entities/contentAssets.entity';
import { Setting } from '@app/common/entities/setting.entity';
import { User } from '@app/common/entities/user.entity';
import { UserProfile } from '@app/common/entities/userProfile.entity';
import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { UserWatchData } from '@app/common/entities/userWatchData.entity';
import { WatchVideoEvent } from '@app/common/entities/watchVideoEvent.entity';
import { SettingRepository } from '@app/common/repositories/setting.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { UserWatchDataRepository } from '@app/common/repositories/userWatchData.repository';
import { WatchVideoEventRepository } from '@app/common/repositories/watchVideoEvent.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { UserSubscriptionUtil } from '@app/common/utils/userSubscription.util';
import { ErrorHandlerModule } from '@app/error-handler';
import { EventsModule } from '@app/events';
import { RedisModule } from '@app/redis';
import { RepositoryCacheModule } from '@app/repository-cache';
import { StorageModule } from '@app/storage';
import { QUEUES } from 'common/constants/queues.const';
import { CombinedPlatterRepository } from 'common/repositories/combinedPlatter.entity';
import { UserProfileRepository } from 'common/repositories/userProfile.repository';
import { AppsFlyerUtils } from 'common/utils/appsflyer.utils';
import { VectorUtils } from 'common/utils/vector.utils';
import { Episode } from 'src/content/entities/episodes.entity';
import { Show } from 'src/content/entities/show.entity';
import { ShowRepository } from 'src/content/repositories/show.repository';
import { RmNumbersService } from 'src/shared/services/rmNumbers.service';
import { PreviewContentEventConsumerService } from 'src/users/consumers/censor-board-cohort.consumer';
import { UserWatchConsumerService } from 'src/users/consumers/userWatchData.consumer';
import { UserProfileService } from 'src/users/services/userProfile.service';
import { UserModule } from 'src/users/user.module';

@Module({
  controllers: [
    ShowsController,
    ContentController,
    MovieController,
    RecommendationController,
    ContentProfileController,
    ReelsController,
    ContentOnboardingController,
    SignedUrlController,
    SpecialAccessController,
    DeepLinkController,
  ],
  exports: [
    ContentProfileService,
    ContentProfileRepository,
    ContentJobDispatcher,
    OnboardingService,
    ContentCategoryOnboardingMappingRepository,
    ContentOnboardingCategoryRepository,
    UserOnboardingPreferenceRepository,
    UserOnboardingStateRepository,
  ],
  imports: [
    StorageModule,
    RedisModule,
    RouterModule.register([{ module: ContentModule, path: 'contents' }]),
    RepositoryCacheModule,
    ErrorHandlerModule,
    EventsModule,
    AuthModule,
    forwardRef(() => UserModule),
    CacheManagerModule,
    BullModule.registerQueue({
      name: QUEUES.CONTENTS,
    }),
    MongooseModule.forFeature([
      createModelDefinition(Show),
      createModelDefinition(Episode),
      createModelDefinition(UpcomingSection),
      createModelDefinition(User),
      createModelDefinition(UserSubscriptionV1),
      createModelDefinition(UserSubscriptionHistory),
      createModelDefinition(UserWatchData),
      createModelDefinition(WatchVideoEvent),
      createModelDefinition(Season),
      createModelDefinition(ContentProfile),
      createModelDefinition(ContentCategoryOnboardingMapping),
      createModelDefinition(ContentOnboardingCategory),
      createModelDefinition(UserOnboardingPreference),
      createModelDefinition(UserOnboardingState),
      createModelDefinition(AppsflyerDeeplink),
      createModelDefinition(UserProfile),
      createModelDefinition(UserContentStates),
      createModelDefinition(ContentAssets),
      createModelDefinition(AssetsV2),
      createModelDefinition(AirbyteRecommendation),
      createModelDefinition(Setting),
    ]),
  ],
  providers: [
    ShowsService,
    ShowRepository,
    EpisodesRepository,
    UpcomingSectionRepository,
    ContentService,
    UserRepository,
    UserSubscriptionV1Repository,
    UserSubscriptionHistoryRepository,
    UserWatchDataRepository,
    WatchVideoEventRepository,
    MovieService,
    PreviewContentEventConsumerService,
    SeasonsRepository,
    ContentMetadataConsumerService,
    UserWatchConsumerService,
    NcantoUtils,
    RecommendationService,
    ContentProfileService,
    ContentProfileRepository,
    UserSubscriptionUtil,
    UserSubscriptionV1Repository,
    UserSubscriptionHistoryRepository,
    ReelsService,
    ReelRepository,
    ReelActionRepository,
    CmsReelRepository,
    ReelsRecommendationService,
    WatchVideoEventRepository,
    ContentJobDispatcher,
    ContentHandlerWorker,
    VectorUtils,
    GenreRepository,
    MicroDramaInteractionRepository,
    OnboardingService,
    ContentCategoryOnboardingMappingRepository,
    ContentOnboardingCategoryRepository,
    UserOnboardingPreferenceRepository,
    UserOnboardingStateRepository,
    OnboardingSeedService,
    SignedUrlService,
    DeepLinkHelper,
    AppsFlyerUtils,
    AppsflyerDeeplinkRepository,
    DeepLinkService,
    SpecialAccessService,
    UserSpecialStatesRepository,
    ContentAssetsRepository,
    AssetsV2Repository,
    UserProfileService,
    UserProfileRepository,
    WatchListMigrationConsumer,
    CombinedPlatterRepository,
    RmNumbersService,
    SettingRepository,
  ],
})
export class ContentModule {}
