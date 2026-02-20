import { Injectable, OnModuleInit, Inject } from '@nestjs/common';

import { Queue } from 'bullmq';

import { Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';

import { json } from 'typia';

import { JOBS_CONFIG } from '../constants/jobs.constants';
import { JobConfig } from '../jobs.module';
import { QUEUES } from '@app/common/constants/queues.const';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(JOBS_CONFIG) private readonly jobs: JobConfig[],
    @InjectQueue(QUEUES.CRON_JOB_QUEUE) private readonly schedulerQueue: Queue,
  ) {}

  async onModuleInit() {
    // Register all jobs on initialization
    for (const job of this.jobs) {
      await this.registerJob(job);
    }
    await this.removeNonExistingJobs();
  }

  registerJob(job: JobConfig) {
    this.logger.debug(
      `Registered Scheduled Job ${job.name} with config ${json.stringify(
        job.repeatOptions,
      )}`,
    );
    return this.schedulerQueue.upsertJobScheduler(job.name, job.repeatOptions);
  }

  async removeNonExistingJobs() {
    const scheduledJobs = await this.schedulerQueue.getJobSchedulers();
    const jobNamesToRemove = scheduledJobs
      .filter((sj) => !this.jobs.some((j) => j.name === sj.name))
      .map((sj) => sj.key);

    return Promise.all(
      jobNamesToRemove.map(async (jobName) => {
        await this.schedulerQueue
          .removeJobScheduler(jobName as string)
          .then((isRemoved) => {
            this.logger.debug(
              `Attempted to remove scheduled job: ${jobName}, removal status: ${isRemoved}`,
            );
          })
          .catch((e) => {
            this.logger.error(`Error removing job ${jobName}: ${e}`);
          });
      }),
    );
  }
}
