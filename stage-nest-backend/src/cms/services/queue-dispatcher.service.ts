// import { InjectQueue } from '@nestjs/bullmq';
// import { Injectable, Logger } from '@nestjs/common';
// import { Queue } from 'bullmq';

// import {
//   CMSQueueKeys,
//   EpisodeProcessingPayload,
// } from '../interfaces/queue-payloads.interface';
// import { ErrorHandlerService } from '@app/error-handler';
// import { QUEUES } from 'common/constants/queues.const';
// import { ContentFormat } from 'common/entities/contents.entity';
// import { Dialect } from 'common/enums/app.enum';

// @Injectable()
// export class CMSQueueDispatcher {
//   private readonly logger = new Logger(CMSQueueDispatcher.name);

//   constructor(
//     @InjectQueue(QUEUES.CMS_CONTENT)
//     private readonly episodeQueue: Queue,
//     private readonly errorHandlerService: ErrorHandlerService,
//   ) { }

//   private buildEpisodeSchedulingJobId(
//     contentType: string,
//     format: ContentFormat,
//     dialect: Dialect,
//     slug: string,
//   ): string {
//     return [
//       CMSQueueKeys.EPISODE_SCHEDULING,
//       contentType,
//       format,
//       dialect,
//       slug,
//     ].join(':');
//   }

//   /**
//    * Dispatches an episode processing job to the CMS queue
//    */
//   async dispatchEpisodeJob(episodeProcessingPayload: EpisodeProcessingPayload) {
//     const { payload } = episodeProcessingPayload;
//     const { contentType, dialect, format, scheduledDate, slug } = payload;
//     return this.errorHandlerService.try(
//       async () => {
//         const jobId = this.buildEpisodeSchedulingJobId(
//           contentType,
//           format,
//           dialect,
//           slug,
//         );

//         const existingJob = await this.episodeQueue.getJob(jobId);

//         const jobOptions = {
//           attempts: 3,
//           backoff: {
//             delay: 2000,
//             type: 'exponential',
//           },
//           delay: scheduledDate.getTime() - Date.now(),
//           jobId,
//           removeOnComplete: 100,
//           removeOnFail: 100,
//         };

//         if (existingJob) this.episodeQueue.remove(jobId);

//         await this.episodeQueue.add(
//           CMSQueueKeys.EPISODE_SCHEDULING,
//           episodeProcessingPayload,
//           jobOptions,
//         );
//       },
//       (error) => {
//         this.logger.error(
//           { error, slug },
//           `Error dispatching episode processing job to CMS queue`,
//         );
//       },
//     );
//   }

//   /**
//    * Removes episode processing jobs from the CMS queue based on criteria
//    */
//   async removeEpisodeJob({
//     contentType,
//     dialect,
//     format,
//     slug,
//   }: {
//     slug: string;
//     dialect: Dialect;
//     contentType: string;
//     format: ContentFormat;
//   }) {
//     return this.errorHandlerService.try(
//       async () => {
//         const jobId = this.buildEpisodeSchedulingJobId(
//           contentType,
//           format,
//           dialect,
//           slug,
//         );
//         return this.episodeQueue.remove(jobId);
//       },
//       (error) => {
//         this.logger.error(
//           { error, slug },
//           `Error removing episode processing jobs from CMS queue`,
//         );
//       },
//     );
//   }
// }
