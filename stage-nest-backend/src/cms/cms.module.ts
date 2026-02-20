// import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { MongooseModule } from '@nestjs/mongoose';

import { ArtistController } from './controllers/artist.controller';
import { CMSUserController } from './controllers/cms-user.controller';
import { CommonController } from './controllers/common.controller';
import { ContentController } from './controllers/content.controller';
import { MediaFilesController } from './controllers/files.controller';

import { MetadataController } from './controllers/metadata.controller';
import { Artist } from './entities/artist-v1.entity';
import { ArtistRepository } from './repositories/artist-v1.repository';
import { ArtistRepositoryV2 } from './repositories/artist.repository';
import { CMSUserRepository } from './repositories/cms-user.repository';
import { ComplianceRepository } from './repositories/compliance.repository';
import { ContentRepository } from './repositories/content.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { GenreRepository } from './repositories/genre.repository';
import { LegacyGenreRepository } from './repositories/legacy-genre.repository';
import { MoodRepository } from './repositories/mood.repository';
import { RawMediaRepository } from './repositories/raw-media.repository';
import { SeasonRepository } from './repositories/season.repository';
import { ShowRepository } from './repositories/show.repository';
import { SubGenreRepository } from './repositories/subgenre.repository';
import { ThemeRepository } from './repositories/theme.repository';
import { ThumbnailCtrRepository } from './repositories/thumbnail-ctr.repository';
import { VideoQcRepository } from './repositories/video-qc.repository';
import { VisionularTaskRepository } from './repositories/visionular.repository';
import { ArtistService } from './services/artist.service';
import { CMSUserService } from './services/cms-user.service';
import { ContentService } from './services/content.service';
import { ExternalContentService } from './services/external-content.service';
import { ExternalFileManagerService } from './services/external-file-manager.service';

import { FileManagerService } from './services/file-manager.service';
import { GoogleDriveService } from './services/google-drive.service';
import { MetadataService } from './services/metadata.service';

import { ShowRepository as ContentShowRepository } from 'src/content/repositories/show.repository';

import { VisionularService } from './services/visionular.service';
import { CacheManagerModule } from '@app/cache-manager';
import { UserCultures } from '@app/common/entities/userCultures.entity';
import { UserCulturesRepository } from '@app/common/repositories/userCulture.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

import { HttpModule } from '@nestjs/axios';

import { AwsWebhookController } from './controllers/cms.webhook';
import { PaymentController } from './controllers/payment.controller';
import { PlatterController } from './controllers/platter.controller';
import { ReelsController } from './controllers/reels.controller';
import { SubtitleController } from './controllers/subtitle.controller';
import { DescriptorTagRepository } from './repositories/descriptor-tag.repository';
import { PlatterRepository } from './repositories/platter.repositoty';
import { ReelRepository } from './repositories/reel.repository';
import { UpcomingSectionRepository } from './repositories/upcoming-section.repository';
import { AwsCmsWebhookService } from './services/aws-cms-webhook.service';
import { ComingSoonService } from './services/coming-soon.service';
import { AWSMediaConvertService } from './services/media-convert.service';
import { MediaSubtitleService } from './services/media-subtitle.service';
import { MogiService } from './services/mogi.services';
import { PaymentService } from './services/payment.service';
import { PlatterService } from './services/platter.service';
import { ReelService } from './services/reel.service';
import { EventService } from '@app/events';
import { AmplitudeEventService } from '@app/events/services/amplitude.service';
import { AppsFlyerEventService } from '@app/events/services/appsflyer.service';
import { CleverTapEventService } from '@app/events/services/clever-tap.service';
import { FirebaseEventService } from '@app/events/services/firebase.service';
import { RudderStackEventService } from '@app/events/services/rudderstack.service';
import { RedisModule, RedisService } from '@app/redis';
import { StorageModule } from '@app/storage';
import { Dialects } from 'common/entities/dialects.enitity';
import { Paywall } from 'common/entities/paywall.entity';
import { Plan } from 'common/entities/plan.entity';
import { User } from 'common/entities/user.entity';
import { WatchVideoEvent } from 'common/entities/watchVideoEvent.entity';
import { DialectsRepository } from 'common/repositories/dialects.repository';
import { PaywallRepository } from 'common/repositories/paywall.repository';
import { PlanRepository } from 'common/repositories/plan.repository';
import { UserRepository } from 'common/repositories/user.repository';
import { WatchVideoEventRepository } from 'common/repositories/watchVideoEvent.repository';
import { Episode } from 'src/content/entities/episodes.entity';
import { Show } from 'src/content/entities/show.entity';
import { EpisodesRepository as ContentEpisodeRepository } from 'src/content/repositories/episode.repository';
import { ReelRepository as ContentReelRepository } from 'src/content/repositories/reel.repository';
import { ReelActionRepository } from 'src/content/repositories/reelAction.repository';

import { CommonService } from 'src/content/services/common.service';

import { BullModule } from '@nestjs/bullmq';

import { VideoQcProgressConsumer } from './consumers/video-qc-progress.consumer';
import { ContentCensorController } from './controllers/content-censor.controller';
import { PosterProjectController } from './controllers/poster-project.controller';
import { ScriptController } from './controllers/script.controller';
import { ClipExtractorController } from './controllers/clip-extractor.controller';
import { ClipExtractorStreamController } from './controllers/clip-extractor-stream.controller';
import { TrailerController } from './controllers/trailer.controller';
import { VideoQcController } from './controllers/video-qc.controller';
import { CmsAssetMonitoringLog } from './entities/cms-asset-monitoring-log.entity';
import { LegacyGenre } from './entities/legacy-genre.entity';
import { PosterProject } from './entities/poster-project.entity';
import { Prompt } from './entities/prompt.entity';
import { ClipExtractorProject } from './entities/clip-extractor-project.entity';
import { TrailerProject } from './entities/trailer-project.entity';
import { TrailerVariant } from './entities/trailer-variant.entity';
import { CmsAssetMonitoringLogRepository } from './repositories/cms-asset-monitoring-log.repository';
import { PosterProjectRepository } from './repositories/poster-project.repository';
import { PromptRepository } from './repositories/prompt.repository';
import { ClipExtractorProjectRepository } from './repositories/clip-extractor-project.repository';
import { TrailerProjectRepository } from './repositories/trailer-project.repository';
import { TrailerVariantRepository } from './repositories/trailer-variant.repository';
import { AiService } from './services/ai.service';
import { CmsJobDispatcher } from './services/cms-job-dispatcher.service';
import { CmsKafkaService } from './services/cms-kafka.service';
import { ContentCensorService } from './services/content-censor.service';
import { GoogleAIService } from './services/google-ai.service';
import { ImageService } from './services/image.service';
import { PosterProjectService } from './services/poster-project.service';
// import { CMSQueueDispatcher } from './services/queue-dispatcher.service';
import { ScriptService } from './services/script.service';
import { TaskExecutionService } from './services/task-execution.service';
import { ClipExtractorService } from './services/clip-extractor.service';
import { TrailerService } from './services/trailer.service';
import { VideoQcService } from './services/video-qc.service';
import { CmsDriveUploadHandlerWorker } from './workers/cms-drive-upload-handler.worker';
import { CmsJobHandlerWorker } from './workers/cms-job-handler.worker';
// import { CMSQueueWorker } from './workers/cms-queue.worker';
import { AdminUserGuard, CMSAuthGuard, CMSOrAdminGuard } from '@app/auth';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { QUEUES } from 'common/constants/queues.const';
// import { QUEUES } from 'common/constants/queues.const';
import { AdminUserModule } from 'src/admin/adminUser/adminUser.module';
import { ReelsRecommendationService } from 'src/content/services/reel-recommendation.service';
import { ReelsService } from 'src/content/services/reels.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  controllers: [
    PlatterController,
    ContentController,
    CMSUserController,
    ArtistController,
    MetadataController,
    CommonController,
    ReelsController,
    MediaFilesController,
    ContentCensorController,
    ScriptController,
    SubtitleController,
    AwsWebhookController,
    PaymentController,
    PosterProjectController,
    TrailerController,
    ClipExtractorController,
    ClipExtractorStreamController,
    VideoQcController,
  ],
  exports: [CmsJobDispatcher],
  imports: [
    HttpModule,
    RepositoryCacheModule,
    CacheManagerModule,
    ErrorHandlerModule,
    NotificationModule,
    BullModule.registerQueue({
      name: QUEUES.CMS_CONTENT,
    }),
    ...(APP_CONFIGS.CMS.ENABLE_UPLOAD_WORKER
      ? [
          BullModule.registerQueue({
            name: QUEUES.CMS_UPLOAD,
          }),
        ]
      : []),
    AdminUserModule,
    // BullModule.registerQueue({
    //   name: QUEUES.CMS_CONTENT,
    // }),
    MongooseModule.forFeature([
      createModelDefinition(Artist),
      createModelDefinition(UserCultures),
      createModelDefinition(Show),
      createModelDefinition(Episode),
      createModelDefinition(User),
      createModelDefinition(WatchVideoEvent),
      createModelDefinition(Plan),
      createModelDefinition(Paywall),
      createModelDefinition(CmsAssetMonitoringLog),
      createModelDefinition(Dialects),
      createModelDefinition(PosterProject),
      createModelDefinition(Prompt),
      createModelDefinition(LegacyGenre),
      createModelDefinition(TrailerProject),
      createModelDefinition(TrailerVariant),
      createModelDefinition(ClipExtractorProject),
    ]),
    StorageModule,
    RedisModule,
    RouterModule.register([
      {
        module: CmsModule,
        path: 'cms',
      },
    ]),
  ],
  providers: [
    ImageService,
    AiService,
    GoogleAIService,
    AWSMediaConvertService,
    ContentRepository,
    ContentService,
    ExternalContentService,
    VisionularService,
    GoogleDriveService,
    CMSUserService,
    CMSUserRepository,
    ArtistService,
    ArtistRepositoryV2,
    ArtistRepository,
    UserCulturesRepository,
    SeasonRepository,
    ShowRepository,
    EpisodeRepository,
    GenreRepository,
    LegacyGenreRepository,
    SubGenreRepository,
    ThemeRepository,
    ThumbnailCtrRepository,
    ComplianceRepository,
    VisionularTaskRepository,
    FileManagerService,
    ExternalFileManagerService,
    RawMediaRepository,
    VideoQcRepository,
    MetadataService,
    MoodRepository,
    DescriptorTagRepository,
    MogiService,
    MediaSubtitleService,
    ComingSoonService,
    UpcomingSectionRepository,
    PlatterService,
    PlatterRepository,
    ReelService,
    ReelRepository,
    CommonService,
    ReelsService,
    ContentShowRepository,
    ContentEpisodeRepository,
    ContentReelRepository,
    ReelActionRepository,
    RedisService,
    EventService,
    AmplitudeEventService,
    FirebaseEventService,
    CleverTapEventService,
    RudderStackEventService,
    UserRepository,
    AppsFlyerEventService,
    ReelsRecommendationService,
    WatchVideoEventRepository,
    ContentCensorService,
    CmsKafkaService,
    VideoQcProgressConsumer,
    VideoQcService,
    TaskExecutionService,
    ScriptService,
    AwsCmsWebhookService,
    PaymentService,
    PlanRepository,
    PaywallRepository,
    DialectsRepository,
    AdminUserGuard,
    CMSAuthGuard,
    CMSOrAdminGuard,
    CmsJobDispatcher,
    CmsJobHandlerWorker,
    ...(APP_CONFIGS.CMS.ENABLE_UPLOAD_WORKER
      ? [CmsDriveUploadHandlerWorker]
      : []),
    CmsAssetMonitoringLogRepository,
    PosterProjectRepository,
    PosterProjectService,
    PromptRepository,
    TrailerProjectRepository,
    TrailerVariantRepository,
    TrailerService,
    ClipExtractorProjectRepository,
    ClipExtractorService,
    // CMSQueueDispatcher,
    // CMSQueueWorker,
  ],
})
export class CmsModule {}
