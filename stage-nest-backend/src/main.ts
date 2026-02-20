import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import './integrations';

import { NestiaSwaggerComposer } from '@nestia/sdk';
import { SwaggerModule } from '@nestjs/swagger';

import { VersioningType } from '@nestjs/common';

import { FastifyRequest } from 'fastify';

import { MikroORM } from '@mikro-orm/mongodb';

import { AuthGuard } from '@app/auth';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { GlobalExceptionFilter } from '@app/common/filters/globalException.filter';

const { ENV, IS_PRODUCTION, PORT } = APP_CONFIGS.PLATFORM;

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    {
      bufferLogs: false,
      logger: IS_PRODUCTION ? ['error', 'warn'] : undefined,
    },
  );
  // configure logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  if (!IS_PRODUCTION) {
    const document = await NestiaSwaggerComposer.document(app, {
      beautify: true,
      security: {
        bearer: {
          in: 'header',
          name: 'Authorization',
          type: 'apiKey',
        },
      },
      servers: [
        {
          description: 'Development Server',
          url: 'https://dev-api.stage.in',
        },
        {
          description: 'Preprod Server',
          url: 'https://preprod-api.stage.in',
        },
        {
          description: 'Local Server',
          url: `http://localhost:${APP_CONFIGS.PLATFORM.PORT}`,
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SwaggerModule.setup('docs', app, document as any, {});
  }

  // enable cors for all routes
  app.enableCors({
    allowedHeaders: '*',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    origin: '*',
  });

  // global middleware, pipe, guard & interceptor definitions
  app.useGlobalGuards(app.get(AuthGuard));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const extractor = (request: unknown): string | string[] =>
    [(request as FastifyRequest).headers['api-version'] ?? '1']
      .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
      .filter((v) => !!v);

  app.enableVersioning({
    extractor,
    type: VersioningType.CUSTOM,
  });

  //Add error handlers here, before starting the server
  process.on('unhandledRejection', (error: Error) => {
    logger.error(error, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error(error, 'Uncaught Exception');
  });
  const orm = await MikroORM.init();
  await orm.schema.createSchema();

  await app.listen(PORT, '0.0.0.0').then(() => {
    logger.log(`Server is listening at port: ${PORT} in ${ENV} env`);
  });
}

void bootstrap();
