import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LoggerModule } from 'nestjs-pino';

import { ScheduleModule } from '@nestjs/schedule';

import { BullModule } from '@nestjs/bullmq';

import { FastifyAdapter } from '@bull-board/fastify';
import { BullBoardModule } from '@bull-board/nestjs';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { ChatModule } from './chat/chat.module';
import { ContentModule } from './content/content.module';
import { CronWorker } from './cron.worker';
import { NotificationModule } from './notification/notification.module';
import { PaymentModule } from './payment/payment.module';
import { PlatformModule } from './platform/platform.module';
import { SharedModule } from './shared/shared.module';
import { UserModule } from './users/user.module';
import { AuthModule } from '@app/auth';

import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { PartnerModule } from './partner/partner.module';
import { CmsModule } from '@app/cms/cms.module';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { JobInventory } from '@app/common/constants/jobs.constant';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler';
import { EventsModule } from '@app/events';
import { JobsModule } from '@app/jobs';
import { KafkaModule } from '@app/kafka';

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
          level: (label) => ({ level: label.toUpperCase() }),
        },
        level: IS_PRODUCTION ? 'info' : 'trace',
        messageKey: 'message',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        ...(IS_PRODUCTION
          ? {
              // No transport: default pino JSON logger, always single line per log
            }
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
    MongooseModule.forRootAsync({
      useFactory: async () => ({
        maxPoolSize: 500,
        maxStalenessSeconds: 300,
        retryWrites: true,
        socketTimeoutMS: 5000,
        uri: APP_CONFIGS.MONGO_DB.URL,
        writeConcern: { w: 'majority' },
      }),
    }),
    // Add secondary MongoDB connection if configured
    ...(APP_CONFIGS.MONGO_DB.EKS_URL
      ? [
          MongooseModule.forRootAsync({
            connectionName: 'secondary',
            useFactory: async () => {
              const logger = new Logger('MongoDBSecondaryConnection');
              logger.log(
                `Connecting to secondary MongoDB at ${APP_CONFIGS.MONGO_DB.EKS_URL}`,
              );
              return {
                maxPoolSize: 500,
                maxStalenessSeconds: 300,
                retryWrites: true,
                socketTimeoutMS: 5000,
                uri: APP_CONFIGS.MONGO_DB.EKS_URL,
                writeConcern: { w: 'majority' },
              };
            },
          }),
        ]
      : []),
    MikroOrmModule.forRoot(),
    KafkaModule.forRootAsync({
      errorHandler: new ErrorHandlerService(),
      useFactory: () => ({
        brokers: APP_CONFIGS.KAFKA.BROKERS,
        clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
        connectionTimeout: 10000,
        retry: { initialRetryTime: 5000, retries: 2 },
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
    PartnerModule,
    ChatModule,
  ],
  providers: [CronWorker],
})
export class AppModule {}
