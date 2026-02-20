import { DynamicModule, Module } from '@nestjs/common';

import { RepeatOptions } from 'bullmq';

import { BullModule } from '@nestjs/bullmq';

import { ConnectionOptions } from 'bullmq';

import { JOBS_CONFIG } from './constants/jobs.constants';
import { SchedulerService } from './services/scheduler.service';
import { SCHEDULED_TASKS } from '@app/common/constants/jobs.constant';
import { QUEUES } from '@app/common/constants/queues.const';

export interface JobConfig {
  name: SCHEDULED_TASKS;
  repeatOptions: Omit<RepeatOptions, 'key'>;
}

@Module({})
export class JobsModule {
  static register(
    jobs: JobConfig[],
    connection: ConnectionOptions,
  ): DynamicModule {
    return {
      imports: [
        BullModule.registerQueue({
          connection,
          name: QUEUES.CRON_JOB_QUEUE,
        }),
      ],
      module: JobsModule,
      providers: [
        {
          provide: JOBS_CONFIG,
          useValue: jobs,
        },
        {
          provide: QUEUES.CRON_JOB_QUEUE,
          useValue: QUEUES,
        },
        SchedulerService,
      ],
    };
  }
}
