import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { BullBoardModule } from '@bull-board/nestjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

import { AdminModule } from '../src/admin/admin.module';
import { AppController } from '../src/app.controller';
import { ContentModule } from '../src/content/content.module';
import { CronWorker } from '../src/cron.worker';
import { NotificationModule } from '../src/notification/notification.module';
import { PaymentModule } from '../src/payment/payment.module';
import { PlatformModule } from '../src/platform/platform.module';
import { SharedModule } from '../src/shared/shared.module';
import { UserModule } from '../src/users/user.module';
import { AuthModule } from '@app/auth';
import { CmsModule } from '@app/cms/cms.module';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { JobInventory } from '@app/common/constants/jobs.constant';
import { QUEUES } from '@app/common/constants/queues.const';
import { EventsModule } from '@app/events';
import { JobsModule } from '@app/jobs';

// Import all MikroORM entities that might be needed
import { ArtistV2 } from '../common/entities/artist-v2.entity';
import { Contents } from '../common/entities/contents.entity';
import { PlanV2 } from '../common/entities/planV2.entity';
import { ReelEntity } from '../common/entities/reel.entity';
import { UpcomingSectionEntity } from '../common/entities/upcoming-section-v2.entity';
import { Seasons } from '../src/cms/entities/seasons.entity';
import { ContentProfile } from '../src/content/entities/contentProfile.entity';
import { MicroDramaInteraction } from '../src/content/entities/microDramaInteraction.entity';
import { ReelAction } from '../src/content/entities/reelAction.entity';
import { MandateV2 } from '../src/shared/entities/mandateV2.entity';
import { UserSubscriptionV2 } from '../src/shared/entities/userSubscriptionV2.entity';
import { CMSUser } from '@app/cms/entities/cms-user.entity';
import { ComplianceEntity } from '@app/cms/entities/compliance.entity';
import { DescriptorTag } from '@app/cms/entities/descriptor-tag.entity';
import { GenreEntity } from '@app/cms/entities/genres.entity';
import { Mood } from '@app/cms/entities/moods.entity';
import { SubGenre } from '@app/cms/entities/sub-genre.entity';
import { Theme } from '@app/cms/entities/themes.entity';
import { VisionularTranscodingTask } from '@app/cms/entities/visionular-transcoding.entity';
import { Episode } from '@app/common/entities/episode.entity';
import { Show } from '@app/common/entities/show-v2.entity';
import { UserProfile } from '@app/common/entities/userProfile.entity';
import { ErrorHandlerService } from '@app/error-handler';
import { KafkaModule } from '@app/kafka';
import { ApplePayTransactions } from '@app/payment/entities/applePayTransactions.entity';
import { MandateRefund } from '@app/payment/entities/mandateRefund.entity';
import { MandateTransactions } from '@app/payment/entities/mandateTransactions.entity';
import { WebhookPayload } from '@app/payment/entities/webhookPayload.entity';
import { MandateNotification } from '@app/shared/entities/mandateNotification.entity';
import { RawMedia } from 'common/entities/raw-media.entity';

const { IS_PRODUCTION } = APP_CONFIGS.PLATFORM;

@Module({
  controllers: [AppController],
  imports: [
    EventsModule,
    BullModule.forRoot({
      connection: {
        db: APP_CONFIGS.BULL_MQ.DB,
        host: APP_CONFIGS.BULL_MQ.HOST,
        port: APP_CONFIGS.BULL_MQ.PORT,
      },
    }),
    BullBoardModule.forRoot({
      adapter: FastifyAdapter,
      boardOptions: { uiConfig: { boardTitle: 'STAGE OTT' } },
      route: '/queues',
    }),
    BullBoardModule.forFeature(
      ...Object.values(QUEUES)
        .filter((queue) => {
          if (queue === QUEUES.CMS_UPLOAD) {
            return APP_CONFIGS.CMS.ENABLE_UPLOAD_WORKER;
          }
          return true;
        })
        .map((queue) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adapter: BullMQAdapter as any,
          name: queue,
        })),
    ),
    JobsModule.register(Object.values(JobInventory), {
      db: APP_CONFIGS.BULL_MQ.DB,
      host: APP_CONFIGS.BULL_MQ.HOST,
      port: APP_CONFIGS.BULL_MQ.PORT,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        customLogLevel: (_, res, err) => {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
          } else if (res.statusCode >= 500 || err) {
            return 'error';
          }
          return 'info';
        },
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
        level: IS_PRODUCTION ? 'info' : 'trace',
        messageKey: 'message',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        ...(IS_PRODUCTION
          ? {}
          : {
              transport: {
                options: {
                  colorize: true,
                  ignore: 'pid,hostname',
                  levelFirst: true,
                  messageFormat: '[{context}]: {message}',
                  singleLine: true,
                },
                target: 'pino-pretty',
              },
            }),
      },
    }),
    ScheduleModule.forRoot(),
    // Use dynamic MongoDB configuration that reads from current environment
    MongooseModule.forRootAsync({
      useFactory: async () => ({
        maxPoolSize: 500,
        maxStalenessSeconds: 300,
        retryWrites: true,
        socketTimeoutMS: 5000,
        uri:
          process.env.MONGO_DB_URI || 'mongodb://localhost:27017/test_fallback',
        writeConcern: { w: 'majority' },
      }),
    }),
    // Add secondary MongoDB connection for tests (uses same test DB)
    MongooseModule.forRootAsync({
      connectionName: 'secondary',
      useFactory: async () => ({
        maxPoolSize: 500,
        maxStalenessSeconds: 300,
        retryWrites: true,
        socketTimeoutMS: 5000,
        uri:
          process.env.MONGO_DB_URI_EKS ||
          'mongodb://localhost:27017/test_fallback_eks',
        writeConcern: { w: 'majority' },
      }),
    }),
    // Add MikroORM with all necessary entities for dependency injection
    MikroOrmModule.forRootAsync({
      useFactory: async () => ({
        clientUrl:
          process.env.MONGO_DB_URI || 'mongodb://localhost:27017/test_fallback',
        connect: false, // Don't auto-connect
        debug: false,
        discovery: { warnWhenNoEntities: false },
        driver: MongoDriver,
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
          ReelEntity,
          ReelAction,
          UpcomingSectionEntity,
          UserProfile,
          MicroDramaInteraction,
        ],
      }),
    }),
    ContentModule,
    PaymentModule,
    AuthModule,
    AdminModule,
    UserModule,
    PlatformModule,
    NotificationModule,
    SharedModule,
    CmsModule,
    KafkaModule.forRootAsync({
      errorHandler: new ErrorHandlerService(),
      useFactory: () => ({
        brokers: APP_CONFIGS.KAFKA.BROKERS,
        clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
        connectionTimeout: 10000,
        retry: { initialRetryTime: 5000, retries: 2 },
      }),
    }),
  ],
  providers: [CronWorker],
})
export class TestAppModule {}
