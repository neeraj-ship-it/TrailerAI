import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';

import {
  BaseRepository,
  Fields,
} from '../../../common/repositories/base.repository';
import { LABEL_TEXT } from '../constants/content.constants';
import {
  MicroDramaResponseDto,
  WatchFilterEnum,
} from '../dto/microDrama.response.dto';
import { Show } from '../entities/show.entity';
import { ShowWithSeasonsAndEpisodes } from '../interfaces/content.interface';
import { SeasonStatus } from '@app/cms/entities/seasons.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import {
  HomePageContentType,
  IHomePageRowData,
} from '@app/common/interfaces/homepage.interface';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';

export type ShowFields = Fields<Show>;

@Injectable()
export class ShowRepository extends BaseRepository<Show> {
  constructor(@InjectModel(Show.name) private showModel: Model<Show>) {
    super(showModel);
  }

  findActiveShowById({ showId }: { showId: number }, projection: ShowFields) {
    return this.findOne(
      {
        _id: showId,
        status: { $in: [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH] },
      },
      projection,
      { cache: { enabled: true }, lean: true },
    );
  }

  findActiveShowBySlug(
    { displayLanguage, slug }: { slug: string; displayLanguage: string },
    projection: ShowFields,
  ) {
    return this.findOne(
      {
        displayLanguage,
        format: ContentFormat.STANDARD,
        slug,
        status: ShowStatus.ACTIVE,
      },
      projection,
      {
        cache: { enabled: true },
        lean: true,
      },
    );
  }

  findActiveShowBySlugForAllFormats(
    { displayLanguage, slug }: { slug: string; displayLanguage: string },
    projection: ShowFields,
  ) {
    return this.findOne(
      {
        displayLanguage,
        format: { $in: [ContentFormat.STANDARD, ContentFormat.MICRO_DRAMA] },
        slug,
        status: ShowStatus.ACTIVE,
      },
      projection,
      {
        cache: { enabled: true },
        lean: true,
      },
    );
  }

  async findMicroDramasWithWatchMetrics(params: {
    dialect: Dialect;
    lang: Lang;
    watchFilter: WatchFilterEnum;
    sortOrder: 1 | -1;
    limit?: number;
    isCached?: boolean;
  }): Promise<MicroDramaResponseDto['data']> {
    const {
      dialect,
      isCached = true,
      lang,
      limit = 10,
      sortOrder,
      watchFilter,
    } = params;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          displayLanguage: lang,
          format: ContentFormat.MICRO_DRAMA,
          language: dialect,
          status: { $in: [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH] },
        },
      },
      {
        $lookup: {
          as: 'watchData',
          from: 'airbyte_raw_RECOMENDATION',
          let: { showSlug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_airbyte_data.SLUG', '$$showSlug'],
                },
              },
            },
            {
              $project: {
                COMPLETED_ABOVE_50: '$_airbyte_data.COMPLETED_ABOVE_50',
                LAST_7DAYS_UNIQUE_WATCHERS:
                  '$_airbyte_data.LAST_7DAYS_UNIQUE_WATCHERS',
                TOTAL_WATCH_TIME: '$_airbyte_data.TOTAL_WATCH_TIME',
                UNIQUE_WATCHERS: '$_airbyte_data.UNIQUE_WATCHERS',
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$watchData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          watchMetric: {
            $ifNull: [`$watchData.${watchFilter}`, 0],
          },
          watchMetrics: {
            COMPLETED_ABOVE_50: {
              $ifNull: ['$watchData.COMPLETED_ABOVE_50', 0],
            },
            LAST_7DAYS_UNIQUE_WATCHERS: {
              $ifNull: ['$watchData.LAST_7DAYS_UNIQUE_WATCHERS', 0],
            },
            TOTAL_WATCH_TIME: {
              $ifNull: ['$watchData.TOTAL_WATCH_TIME', 0],
            },
            UNIQUE_WATCHERS: {
              $ifNull: ['$watchData.UNIQUE_WATCHERS', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          description: 1,
          format: 1,
          releaseDate: 1,
          selectedPeripheral: 1,
          slug: 1,
          thumbnail: 1,
          title: 1,
          watchMetric: 1,
          watchMetrics: 1,
        },
      },
      {
        $sort: {
          watchMetric: sortOrder,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          watchMetric: 0,
        },
      },
    ];

    const result = await this.aggregate<MicroDramaResponseDto['data'][0]>(
      pipeline,
      {
        cache: { enabled: isCached },
      },
    );
    return result || [];
  }

  async getShowInHomePageResponse(displayLanguage: Lang, slug: string) {
    const show = await this.findOne(
      {
        displayLanguage,
        format: ContentFormat.STANDARD,
        slug,
        status: ShowStatus.ACTIVE,
      },
      [
        '_id',
        'title',
        'language',
        'displayLanguage',
        'thumbnail',
        'releaseDate',
        'label',
        'selectedPeripheral',
        'genreList',
        'duration',
        'complianceRating',
        'description',
      ],
      { cache: { enabled: true }, lean: true },
    );

    if (!show) {
      return null;
    }

    // Apply conditional logic for overlayTag after DB call
    const response: IHomePageRowData = {
      _id: show._id,
      complianceRating: show.complianceRating,
      contentType: HomePageContentType.SHOW,
      description: show.description,
      duration: show.duration,
      genreList: show.genreList,
      releaseDate: show.releaseDate?.toString() || '',
      selectedPeripheral: show?.selectedPeripheral,
      slug,
      thumbnail: show.thumbnail,
      title: show.title,
    };

    if (show.label && [LABEL_TEXT.en, LABEL_TEXT.hin].includes(show.label)) {
      response.overlayTag = show.label;
    }

    return response;
  }

  getShowWithSeasonAndEpisode(
    showId: number,
    seasonId: number,
  ): Promise<ShowWithSeasonsAndEpisodes[] | null> {
    return this.aggregate<ShowWithSeasonsAndEpisodes>(
      [
        {
          $match: {
            $and: [
              {
                $or: [
                  {
                    _id: showId,
                  },
                  {
                    referenceShowIds: showId,
                  },
                ],
              },
              {
                $or: [
                  {
                    status: {
                      $in: [
                        ShowStatus.ACTIVE,
                        ShowStatus.PREVIEW_PUBLISH,
                        ShowStatus.COMING_SOON,
                      ],
                    },
                  },
                  {
                    isComingSoon: true,
                  },
                ],
              },
            ],
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $lookup: {
            as: 'seasons',
            foreignField: 'showId',
            from: 'seasons',
            localField: '_id',
          },
        },
        {
          $addFields: {
            seasons: {
              $filter: {
                as: 'season',
                cond: {
                  $or: [
                    {
                      $in: [
                        '$$season.status',
                        [
                          SeasonStatus.ACTIVE,
                          SeasonStatus.PREVIEW_PUBLISHED,
                          SeasonStatus.COMING_SOON,
                        ],
                      ],
                    },
                    {
                      $and: [
                        { $ne: ['$$season.isComingSoon', null] },
                        { $eq: ['$$season.isComingSoon', true] },
                      ],
                    },
                  ],
                },
                input: '$seasons',
              },
            },
          },
        },
        {
          $lookup: {
            as: 'showEpisodes',
            from: 'episodes',
            let: {
              seasonIds: '$seasons._id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $in: ['$seasonId', '$$seasonIds'],
                      },
                      {
                        $in: [
                          '$status',
                          [
                            EpisodeStatus.ACTIVE,
                            EpisodeStatus.PREVIEW_PUBLISHED,
                            EpisodeStatus.DRAFT,
                            EpisodeStatus.COMING_SOON,
                          ],
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $sort: {
                  episodeOrder: 1, // Sorting in ascending order
                },
              },
            ],
          },
        },
        {
          $addFields: {
            seasons: {
              $map: {
                as: 'season',
                in: {
                  $mergeObjects: [
                    '$$season',
                    {
                      episodes: {
                        $filter: {
                          as: 'episode',
                          cond: {
                            $eq: ['$$episode.seasonId', '$$season._id'],
                          },
                          input: '$showEpisodes',
                        },
                      },
                    },
                  ],
                },
                input: '$seasons',
              },
            },
          },
        },
        {
          $addFields: {
            selectedPeripheralOne: {
              $let: {
                in: {
                  $cond: {
                    else: '$$REMOVE',
                    if: {
                      $gt: [
                        {
                          $size: '$$matchingSeasons',
                        },
                        0,
                      ],
                    },
                    then: '$selectedPeripheral',
                  },
                },
                vars: {
                  matchingSeasons: {
                    $filter: {
                      as: 'season',
                      cond: {
                        $eq: ['$$season._id', seasonId],
                      },
                      input: '$seasons',
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: showId,
            artistList: {
              $first: '$artistList',
            },
            complianceList: {
              $first: '$complianceList',
            },
            description: {
              $first: '$description',
            },
            displayLanguage: {
              $first: '$displayLanguage',
            },
            format: {
              $first: '$format',
            },
            isPremium: {
              $first: '$isPremium',
            },
            language: {
              $first: '$language',
            },
            latestSeasonReleaseDate: {
              $last: '$releaseDate',
            },
            seasons: {
              $push: '$seasons',
            },
            selectedPeripheral: {
              $first: '$selectedPeripheral',
            },
            selectedPeripheralOne: {
              $push: '$selectedPeripheralOne',
            },
            slug: {
              $first: '$slug',
            },
            status: {
              $first: '$status',
            },
            thumbnail: {
              $first: '$thumbnail',
            },
            title: {
              $first: '$title',
            },
            upcomingScheduleText: {
              $first: '$upcomingScheduleText',
            },
          },
        },
        {
          $addFields: {
            seasons: {
              $reduce: {
                in: {
                  $concatArrays: ['$$value', '$$this'],
                },
                initialValue: [],
                input: '$seasons',
              },
            },
          },
        },
        {
          $project: {
            artistList: 1,
            complianceList: 1,
            description: 1,
            displayLanguage: 1,
            format: 1,
            isComingSoon: 1,
            isPremium: 1,
            language: 1,
            latestSeasonReleaseDate: 1,
            seasons: 1,
            selectedPeripheral: {
              $cond: {
                else: '$selectedPeripheral',
                if: {
                  $gt: [
                    {
                      $size: '$selectedPeripheralOne',
                    },
                    0,
                  ],
                },
                then: {
                  $arrayElemAt: ['$selectedPeripheralOne', 0],
                },
              },
            },
            slug: 1,
            status: 1,
            thumbnail: 1,
            title: 1,
            upcomingScheduleText: {
              $cond: {
                else: '$upcomingScheduleText',
                if: {
                  $or: [
                    { $eq: ['$upcomingScheduleText', null] },
                    { $eq: ['$upcomingScheduleText', ''] },
                  ],
                },
                then: '$$REMOVE',
              },
            },
          },
        },
      ],
      { cache: { enabled: false } },
    );
  }
}
