import { defineConfig } from '@mikro-orm/mongodb';

import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

import { APP_CONFIGS } from './common/configs/app.config';
import { PlanV2 } from './common/entities/planV2.entity';
import { MandateTransactions } from '@app/payment/entities/mandateTransactions.entity';
import {
  MandateEntityChangeSubscriber,
  MandateV2,
} from '@app/shared/entities/mandateV2.entity';
import {
  UserSubscriptionEntityChangeSubscriber,
  UserSubscriptionV2,
} from '@app/shared/entities/userSubscriptionV2.entity';

import { Logger } from '@nestjs/common';

import { UpcomingSectionEntity } from './common/entities/upcoming-section-v2.entity';
import { Seasons } from './src/cms/entities/seasons.entity';
import { CMSUser } from '@app/cms/entities/cms-user.entity';
import { ComplianceEntity } from '@app/cms/entities/compliance.entity';
import { DescriptorTag } from '@app/cms/entities/descriptor-tag.entity';
import { GenreEntity } from '@app/cms/entities/genres.entity';
import { Mood } from '@app/cms/entities/moods.entity';

import { SubGenre } from '@app/cms/entities/sub-genre.entity';
import { Theme } from '@app/cms/entities/themes.entity';
import { ThumbnailCtr } from '@app/cms/entities/thumbnail-ctr.entity';
import { VideoQc } from '@app/cms/entities/video-qc.entity';
import { VisionularTranscodingTask } from '@app/cms/entities/visionular-transcoding.entity';
import { Episode } from '@app/common/entities/episode.entity';
import {
  RawMediaEntityChangeSubscriber,
  RawMedia,
} from '@app/common/entities/raw-media.entity';
import { Show } from '@app/common/entities/show-v2.entity';
import { ApplePayTransactions } from '@app/payment/entities/applePayTransactions.entity';
import {
  MandateRefund,
  MandateRefundEntityChangeSubscriber,
} from '@app/payment/entities/mandateRefund.entity';
import { WebhookPayload } from '@app/payment/entities/webhookPayload.entity';
import {
  MandateNotification,
  MandateNotificationEntityChangeSubscriber,
} from '@app/shared/entities/mandateNotification.entity';
import { TvDetail } from '@app/shared/entities/tvDetail.entity';
import { ArtistV2 } from 'common/entities/artist-v2.entity';
import { CombinedPlatter } from 'common/entities/combined-platter.entity';
import { Contents } from 'common/entities/contents.entity';
import {
  ReelEntity,
  ReelEntityChangeSubscriber,
} from 'common/entities/reel.entity';
import { ContentProfile } from 'src/content/entities/contentProfile.entity';
import { MicroDramaInteraction } from 'src/content/entities/microDramaInteraction.entity';
import { ReelAction } from 'src/content/entities/reelAction.entity';
const logger = new Logger('MikroORM');

export default defineConfig({
  clientUrl: APP_CONFIGS.MONGO_DB.URL,
  debug: !APP_CONFIGS.IS_PRODUCTION,
  discovery: {
    // we need to disable validation for no entities, due to the entity generation
    warnWhenNoEntities: false,
  },
  entities: [
    MandateV2,
    UserSubscriptionV2,
    MandateTransactions,
    ApplePayTransactions,
    PlanV2,
    MandateNotification,
    MandateRefund,
    WebhookPayload,
    Contents,
    ArtistV2,
    CMSUser,
    ContentProfile,
    SubGenre,
    GenreEntity,
    Episode,
    RawMedia,
    VisionularTranscodingTask,
    Theme,
    Mood,
    ComplianceEntity,
    Show,
    Seasons,
    DescriptorTag,
    ThumbnailCtr,
    ReelEntity,
    UpcomingSectionEntity,
    CombinedPlatter,
    TvDetail,
    ReelAction,
    MicroDramaInteraction,
    VideoQc,
  ],
  entitiesTs: [
    MandateV2,
    UserSubscriptionV2,
    MandateTransactions,
    ApplePayTransactions,
    PlanV2,
    MandateNotification,
    MandateRefund,
    WebhookPayload,
    Contents,
    ArtistV2,
    CMSUser,
    ContentProfile,
    SubGenre,
    Episode,
    RawMedia,
    VisionularTranscodingTask,
    GenreEntity,
    Theme,
    Mood,
    ComplianceEntity,
    Show,
    Seasons,
    DescriptorTag,
    ThumbnailCtr,
    UpcomingSectionEntity,
    CombinedPlatter,
    TvDetail,
    ReelEntity,
    ReelAction,
    MicroDramaInteraction,
    VideoQc,
  ],
  entityGenerator: {
    bidirectionalRelations: true,
    customBaseEntityName: 'Base',
    outputPurePivotTables: true,
    path: 'src/modules',
    readOnlyPivotTables: true,
    save: true,
    useCoreBaseEntity: true,
  },
  implicitTransactions: true,
  logger: logger.debug.bind(logger),
  metadataProvider: TsMorphMetadataProvider,
  multipleStatements: true,
  subscribers: [
    MandateNotificationEntityChangeSubscriber,
    MandateEntityChangeSubscriber,
    UserSubscriptionEntityChangeSubscriber,
    MandateRefundEntityChangeSubscriber,
    RawMediaEntityChangeSubscriber,
    ReelEntityChangeSubscriber,
  ],
});
