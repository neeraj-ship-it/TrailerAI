import { WorkerHost } from '@nestjs/bullmq';

import { Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Inject, Logger } from '@nestjs/common';
import { json } from 'typia';

import { CMSQueuePayload } from '../interfaces/queue-payloads.interface';
import { CMSQueueKeys } from '../interfaces/queue-payloads.interface';
import { CmsAssetMonitoringLogRepository } from '../repositories/cms-asset-monitoring-log.repository';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler';
import {
  NotificationKeys,
  NotificationPayload,
} from 'src/notification/interfaces/notificationPayload.interface';
import { NotificationDispatcher } from 'src/notification/services/notificationDispatcher.service';

@Processor(QUEUES.CMS_CONTENT, {
  concurrency: 100,
})
export class CmsJobHandlerWorker extends WorkerHost {
  private readonly logger = new Logger(CmsJobHandlerWorker.name);

  constructor(
    @Inject() private readonly errorHandlerService: ErrorHandlerService,
    private readonly cmsAssetMonitoringLogRepository: CmsAssetMonitoringLogRepository,
    private readonly notificationDispatcher: NotificationDispatcher,
  ) {
    super();
  }

  private async dispatchNotification(data: NotificationPayload) {
    return this.errorHandlerService.try(
      async () => {
        await this.notificationDispatcher.dispatchNotification(data);
        this.logger.debug(
          `Dispatched job with payload ${json.stringify(data)}`,
        );
      },
      (error) => {
        this.logger.error(
          { error },
          `Error registering notification on the queue`,
        );
      },
    );
  }

  private async getAssetMonitoringData(): Promise<{
    moviesMissingAsset: number;
    showsMissingAsset: number;
    totalContentMissingAsset: number;
  }> {
    this.logger.log('Collecting asset monitoring data...');

    const [episodesWithMissingAssets, error] =
      await this.errorHandlerService.try(
        async () =>
          this.cmsAssetMonitoringLogRepository.getEpisodesWithMissingAssets(),
        (err) => {
          this.logger.error(
            { error: err },
            'Error collecting asset monitoring data',
          );
        },
      );

    if (!episodesWithMissingAssets || error) {
      return {
        moviesMissingAsset: 0,
        showsMissingAsset: 0,
        totalContentMissingAsset: 0,
      };
    }

    const moviesMissingAsset = episodesWithMissingAssets.moviesCount;
    const showsMissingAsset = episodesWithMissingAssets.showsCount;
    const totalContentMissingAsset = moviesMissingAsset + showsMissingAsset;

    this.logger.log(
      `Found ${moviesMissingAsset} movies, ${showsMissingAsset} shows with missing assets`,
    );

    return {
      moviesMissingAsset,
      showsMissingAsset,
      totalContentMissingAsset,
    };
  }

  private async handleAssetMonitoring() {
    const monitoringData = await this.getAssetMonitoringData();

    await this.cmsAssetMonitoringLogRepository.createLog({
      noOfMoviesMissingAsset: monitoringData.moviesMissingAsset,
      noOfShowsMissingAsset: monitoringData.showsMissingAsset,
      noOfTotalContentMissingAsset: monitoringData.totalContentMissingAsset,
    });
    const notificationMsg = `*Unique Movies Missing Assets:* ${monitoringData.moviesMissingAsset}\n*Unique Shows Missing Assets:* ${monitoringData.showsMissingAsset}\n*Total Unique Content Missing Assets:* ${monitoringData.totalContentMissingAsset}`;
    await this.dispatchNotification({
      key: NotificationKeys.SEND_CMS_ASSET_MONITORING_NOTIFICATION,
      payload: { message: notificationMsg },
    });
    this.logger.log(notificationMsg);
  }

  async process({ data }: Job<CMSQueuePayload>) {
    return this.errorHandlerService.try(async () => {
      switch (data.key) {
        case CMSQueueKeys.CMS_CONTENT_PERIPHERAL_ASSET_MONITORING:
          return this.handleAssetMonitoring();
      }
    });
  }
}
