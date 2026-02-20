import { DynamicModule, Module } from '@nestjs/common';

import { KafkaConfig } from './interfaces/kafka-config.interface';
import { KafkaService } from './kafka.service';
import { ErrorHandlerService } from '@app/error-handler';

@Module({})
export class KafkaModule {
  static forRoot(
    config: KafkaConfig,
    errorHandler: ErrorHandlerService,
  ): DynamicModule {
    return {
      exports: [KafkaService],
      global: false,
      module: KafkaModule,
      providers: [
        {
          provide: KafkaService,
          useValue: new KafkaService(config, errorHandler),
        },
      ],
    };
  }
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<KafkaConfig> | KafkaConfig;
    errorHandler: ErrorHandlerService;
  }): DynamicModule {
    return {
      exports: [KafkaService],
      global: true,
      module: KafkaModule,
      providers: [
        {
          inject: [],
          provide: KafkaService,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return new KafkaService(config, options.errorHandler);
          },
        },
      ],
    };
  }
}
