// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { Logger } from '@nestjs/common';
// import { Job } from 'bullmq';

// import {
//   CMSQueueKeys,
//   CMSQueuePayload,
// } from '../interfaces/queue-payloads.interface';
// import { ExternalContentService } from '../services/external-content.service';
// import { ErrorHandlerService } from '@app/error-handler';
// import { QUEUES } from 'common/constants/queues.const';

// @Processor(QUEUES.CMS_CONTENT, {
//   concurrency: 10,
// })
// export class CMSQueueWorker extends WorkerHost {
//   private readonly logger = new Logger(CMSQueueWorker.name);

//   constructor(
//     private readonly errorHandlerService: ErrorHandlerService,
//     private readonly externalContentService: ExternalContentService,
//   ) {
//     super();
//   }

//   private async handleCMSJob(data: CMSQueuePayload) {
//     switch (data.key) {
//       case CMSQueueKeys.EPISODE_SCHEDULING:
//         return this.handleScheduledEpisodeJob(data);
//       default: {
//         const _exhaustiveCheck: never = data.key;
//         throw new Error(`Unhandled CMS queue key: ${_exhaustiveCheck}`);
//       }
//     }
//   }

//   private async handleScheduledEpisodeJob(data: CMSQueuePayload) {
//     return this.errorHandlerService.try(async () => {
//       const { payload } = data;
//       const { contentType, dialect, format, slug } = payload;

//       this.logger.log(`Processing episode ${slug} for ${contentType}`);

//       await this.externalContentService.publishEpisode({
//         contentType: contentType,
//         dialect,
//         format,
//         slug,
//       });

//       this.logger.log(`Successfully published episodes for ${slug}`);
//     });
//   }

//   async process({ data }: Job<CMSQueuePayload>) {
//     this.logger.log(`Processing CMS episode queue job: ${data.key}`);
//     return this.handleCMSJob(data);
//   }
// }
