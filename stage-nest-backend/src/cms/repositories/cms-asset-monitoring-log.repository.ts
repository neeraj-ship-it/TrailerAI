import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CmsAssetMonitoringLog } from '../entities/cms-asset-monitoring-log.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { ErrorHandlerService } from '@app/error-handler';
import { EpisodeType, EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';
import { ShowRepository } from 'src/content/repositories/show.repository';

@Injectable()
export class CmsAssetMonitoringLogRepository extends BaseRepository<CmsAssetMonitoringLog> {
  private readonly errorLogger = new Logger(
    CmsAssetMonitoringLogRepository.name,
  );

  constructor(
    @InjectModel(CmsAssetMonitoringLog.name)
    private readonly cmsAssetMonitoringLogModel: Model<CmsAssetMonitoringLog>,
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly episodesRepository: EpisodesRepository,
    private readonly showRepository: ShowRepository,
  ) {
    super(cmsAssetMonitoringLogModel);
  }

  async createLog(
    logData: Partial<CmsAssetMonitoringLog>,
  ): Promise<CmsAssetMonitoringLog> {
    const defaultLogData = {
      noOfMoviesMissingAsset: 0,
      noOfShowsMissingAsset: 0,
      noOfTotalContentMissingAsset: 0,
      ...logData,
    };

    return await this.create({
      noOfMoviesMissingAsset: defaultLogData.noOfMoviesMissingAsset ?? 0,
      noOfShowsMissingAsset: defaultLogData.noOfShowsMissingAsset ?? 0,
      noOfTotalContentMissingAsset:
        defaultLogData.noOfTotalContentMissingAsset ?? 0,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.cmsAssetMonitoringLogModel.findByIdAndDelete(id).exec();
  }

  async findByDate(logDate: Date): Promise<CmsAssetMonitoringLog | null> {
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.findOne({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });
  }

  async getEpisodesWithMissingAssets(): Promise<{
    moviesCount: number;
    showsCount: number;
    movies: string[];
    shows: string[];
  }> {
    const [result, error] = await this.errorHandlerService.try(
      async () => {
        // Query episodes collection for movies (type = 'individual') and get unique slugs
        const moviesWithMissingAssets =
          await this.episodesRepository.aggregate<{
            slug: string;
          }>([
            {
              $match: {
                $or: [
                  {
                    'selectedPeripheral.hlsSourceLink': {
                      $in: [null, '', undefined],
                    },
                  },
                  {
                    'selectedPeripheral.sourceLink': {
                      $in: [null, '', undefined],
                    },
                  },
                  {
                    'selectedPeripheral.thumbnail.horizontal.sourceLink': {
                      $in: [null, '', undefined],
                    },
                  },
                  {
                    'selectedPeripheral.visionularHls.sourceLink': {
                      $in: [null, '', undefined],
                    },
                  },
                  {
                    'selectedPeripheral.visionularHls.hlsSourcelink': {
                      $in: [null, '', undefined],
                    },
                  },
                ],
                status: EpisodeStatus.ACTIVE,
                type: EpisodeType.INDIVIDUAL,
              },
            },
            {
              $group: {
                _id: '$slug',
              },
            },
            {
              $project: {
                _id: 0,
                slug: '$_id',
              },
            },
          ]);

        // Query shows collection for shows with missing assets and get unique slugs
        const showsWithMissingAssets = await this.showRepository.aggregate<{
          slug: string;
        }>([
          {
            $match: {
              $or: [
                {
                  'selectedPeripheral.hlsSourceLink': {
                    $in: [null, '', undefined],
                  },
                },
                {
                  'selectedPeripheral.sourceLink': {
                    $in: [null, '', undefined],
                  },
                },
                {
                  'selectedPeripheral.thumbnail.horizontal.sourceLink': {
                    $in: [null, '', undefined],
                  },
                },
                {
                  'selectedPeripheral.visionularHls.sourceLink': {
                    $in: [null, '', undefined],
                  },
                },
                {
                  'selectedPeripheral.visionularHls.hlsSourcelink': {
                    $in: [null, '', undefined],
                  },
                },
              ],
              status: ShowStatus.ACTIVE,
            },
          },
          {
            $group: {
              _id: '$slug',
            },
          },
          {
            $project: {
              _id: 0,
              slug: '$_id',
            },
          },
        ]);

        const movies = (moviesWithMissingAssets || []).map(
          (movie) => movie.slug,
        );
        const shows = (showsWithMissingAssets || []).map((show) => show.slug);

        return {
          movies,
          moviesCount: movies.length,
          shows,
          showsCount: shows.length,
        };
      },
      (error) => {
        this.errorLogger.error(
          { error },
          'Error querying episodes/shows with missing assets',
        );
      },
    );

    if (error || !result) {
      return { movies: [], moviesCount: 0, shows: [], showsCount: 0 };
    }

    return result;
  }

  async getLatestLog(): Promise<CmsAssetMonitoringLog | null> {
    return await this.findOne({}, undefined, {
      sort: { createdAt: -1 },
    });
  }

  async getLogsForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<CmsAssetMonitoringLog[] | null> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.find(
      {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      undefined,
      {
        sort: { createdAt: -1 },
      },
    );
  }

  async getLogsForLastNDays(
    days: number,
  ): Promise<CmsAssetMonitoringLog[] | null> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return await this.getLogsForDateRange(startDate, endDate);
  }
}
