import { WorkerHost } from '@nestjs/bullmq';

import { Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Inject, Logger } from '@nestjs/common';

import axios, { AxiosError } from 'axios';

import {
  ContentQueueKeys,
  ContentQueuePayload,
} from '../interfaces/paymentQueuePayload.interface';
import { ContentStaticalData } from '../interfaces/statical-data.interface';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ReelRepository } from '../repositories/reel.repository';
import { ShowRepository } from '../repositories/show.repository';
import { ReelsRecommendationService } from '../services/reel-recommendation.service';
import { GenreEntity } from '@app/cms/entities/genres.entity';
import { GenreRepository } from '@app/cms/repositories/genre.repository';
import { QUEUES } from '@app/common/constants/queues.const';
import { ErrorHandlerService } from '@app/error-handler';
import { EventService } from '@app/events';
import { ComplexRedisService } from '@app/redis/stores/complex-redis.service';
import { APP_CONFIGS } from 'common/configs/app.config';
import { ContentStatus } from 'common/entities/contents.entity';
import { ReelEntity, ReelStatusEnum } from 'common/entities/reel.entity';
import { Lang } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';
import { handleAxiosErrorLog } from 'common/utils/helpers';
import { VectorUtils } from 'common/utils/vector.utils';

@Processor(QUEUES.CONTENTS, {
  concurrency: 100,
})
export class ContentHandlerWorker extends WorkerHost {
  private logger = new Logger(ContentHandlerWorker.name);

  constructor(
    @Inject() private eventsService: EventService,
    @Inject() private errorHandlerService: ErrorHandlerService,
    @Inject() private reelRepository: ReelRepository,
    @Inject() private reelsRecommendationService: ReelsRecommendationService,
    @Inject() private showRepository: ShowRepository,
    @Inject() private episodeRepository: EpisodesRepository,
    @Inject() private vectorUtils: VectorUtils,
    @Inject() private genreRepository: GenreRepository,
    @Inject() private redisService: ComplexRedisService,
  ) {
    super();
  }
  private async contentStaticalData(url: string) {
    const [contentDataList, contentFetchError] =
      await this.errorHandlerService.try<ContentStaticalData[], AxiosError>(
        async (): Promise<ContentStaticalData[]> => {
          const response = await axios.get(url);
          return response.data;
        },
      );

    if (contentFetchError) {
      this.logger.error(
        { error: handleAxiosErrorLog(contentFetchError) },
        `Error fetching content statical data:${url}`,
      );
      return [];
    }

    return contentDataList;
  }

  private contentStaticalScore(
    movieData: ContentStaticalData,
    movieDataList: ContentStaticalData[],
  ): number {
    const { COUNT_INTENTIONAL_WATCHERS: CIW } = movieData;
    const R = this.getR(movieData);
    const R_AVG =
      movieDataList.reduce((acc, curr) => acc + this.getR(curr), 0) /
      movieDataList.length;
    const M = 500;
    const score = (CIW / (CIW + M)) * R + (M / (CIW + M)) * R_AVG;
    return score * 100;
  }

  private async fetchReelRecommendationStaticalData() {
    const { BHO_MOVIE, BHO_SHOW, HAR_MOVIE, HAR_SHOW, RAJ_MOVIE, RAJ_SHOW } =
      APP_CONFIGS.RECOMMENDATION.REELS.STATICAL_DATA_URL;

    const [harMovieDataList, rajMovieDataList, bhoMovieDataList] =
      await Promise.all([
        this.contentStaticalData(HAR_MOVIE),
        this.contentStaticalData(RAJ_MOVIE),
        this.contentStaticalData(BHO_MOVIE),
      ]);

    const movieList = [
      ...harMovieDataList,
      ...rajMovieDataList,
      ...bhoMovieDataList,
    ];

    await this.processMovieData(movieList);

    const [harShowDataList, rajShowDataList, bhoShowDataList] =
      await Promise.all([
        this.contentStaticalData(HAR_SHOW),
        this.contentStaticalData(RAJ_SHOW),
        this.contentStaticalData(BHO_SHOW),
      ]);

    const showList = [
      ...harShowDataList,
      ...rajShowDataList,
      ...bhoShowDataList,
    ];
    await this.processShowData(showList);

    return true;
  }

  private getR(movieData: ContentStaticalData) {
    const {
      INTENTIONAL_WATCH_RATE: IWR,
      INTENTIONAL_WATCHERS_COMPLETION_RATE: IWCR,
      INTENTIONAL_WATCHERS_HOOK_RATE: IWHR,
      INTENTIONAL_WATCHERS_WATCH_RATE: IWWR,
    } = movieData;
    return 0.4 * IWCR + 0.3 * IWHR + 0.2 * IWWR + 0.1 * IWR;
  }
  private async handleContentJob(data: ContentQueuePayload) {
    switch (data.key) {
      case ContentQueueKeys.REEL_RECOMMENDATION_STATICAL_DATA_UPDATE:
        return this.fetchReelRecommendationStaticalData();
      case ContentQueueKeys.REEL_RECOMMENDATION_SIMILARITY_DATA_UPDATE:
        return this.processSimilarityData();
      case ContentQueueKeys.REEL_RECOMMENDATION_SERENDIPITY_DATA_UPDATE:
        return this.processSerendipityData();
    }
  }

  private async processMovieData(movieDataList: ContentStaticalData[]) {
    await Promise.all(
      movieDataList.map(async (movieData) => {
        const { CONTENT_DIALECT, CONTENT_SLUG } = movieData;

        const [reel, reelError] = await this.errorHandlerService.try<
          ReelEntity,
          Error
        >(async (): Promise<ReelEntity> => {
          return this.reelRepository
            .getEntityManager()
            .fork()
            .findOneOrFail(ReelEntity, {
              contentSlug: CONTENT_SLUG,
              contentType: ContentType.MOVIE,
              dialect: CONTENT_DIALECT,
              status: ReelStatusEnum.PUBLISHED,
            });
        });

        if (reelError) {
          return;
        }

        const score = this.contentStaticalScore(movieData, movieDataList);
        await this.reelsRecommendationService.addReelStaticalScore(
          reel._id.toString(),
          score,
          reel.dialect,
        );
      }),
    );
  }

  private async processSerendipityData() {
    const shows = await this.showRepository.find(
      {
        status: ContentStatus.ACTIVE,
      },
      ['slug', 'language'],
      { lean: true },
    );
    const movies = await this.episodeRepository.find(
      {
        status: ContentStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      ['slug', 'language'],
      { lean: true },
    );

    const allContent = [
      ...(shows?.map((show) => ({ ...show, type: ContentType.SHOW })) || []),
      ...(movies?.map((movie) => ({ ...movie, type: ContentType.MOVIE })) ||
        []),
    ];

    await Promise.all(
      allContent.map(async (content) => {
        try {
          // Get similarity and dissimilarity scores for this content
          const contentSlugKey = `${content.type}_${content.slug}`;
          const [similarityScores, contentReels] = await Promise.all([
            this.redisService.zrange(
              `${content.language}:similarity:${contentSlugKey}`,
              0,
              0,
              true,
            ),
            this.redisService.smembers(
              `${content.language}:content:${contentSlugKey}:reels`,
            ),
          ]);

          if (similarityScores.length * contentReels.length === 0) {
            console.log('contentReels here', contentReels);
            return;
          }
          // const similarContentSlug = similarityScores[0]; // TODO: check this
          const similarityScore = similarityScores[1];

          // const reelStatisticalScores = await Promise.all(
          contentReels.map(async (reel) => {
            const statisticalScore = await this.redisService.zscore(
              `${content.language}:statistical`,
              reel,
            );

            const serendipityScore =
              ((100 - parseFloat(similarityScore)) *
                (statisticalScore !== null
                  ? parseFloat(statisticalScore)
                  : 0)) /
              10000;
            await this.redisService.zadd(
              `${content.language}:serendipity`,
              serendipityScore,
              `${reel}`,
            );
          });
          // );

          // console.log('reelStatisticalScores here', reelStatisticalScores);
          // // Get statistical score for this content
          // const statisticalScore = await this.redisService.zscore(
          //   `${content.language}:statistical`,
          //   content.slug,
          // );

          // Calculate serendipity scores
          // const pipeline = await this.redisService.getPipeline();

          // for (const [
          //   similarContentSlug,
          //   similarityScore,
          // ] of similarityScores) {
          //   const dissimilarityScore = 100 - parseFloat(similarityScore);

          //   const serendipityScore =
          //     (dissimilarityScore * parseFloat(statisticalScore || '0')) / 100;

          //   if (serendipityScore > 0) {
          //     pipeline.zadd(
          //       `${content.language}:serendipity:${contentSlugKey}`,
          //       serendipityScore,
          //       similarContentSlug,
          //     );
          //     pipeline.zadd(
          //       `${content.language}:serendipity:${content.type}_${similarContentSlug}`,
          //       serendipityScore,
          //       content.slug,
          //     );
          //   }
          // }

          // await pipeline.exec();
        } catch (e) {
          this.logger.error(
            { error: e },
            `Error processing serendipity data for content ${content.slug}`,
          );
        }
      }),
    );

    return true;
  }

  private async processShowData(showDataList: ContentStaticalData[]) {
    await Promise.all(
      showDataList.map(async (showData) => {
        const { CONTENT_DIALECT, CONTENT_SLUG } = showData;

        const [reel, reelError] = await this.errorHandlerService.try<
          ReelEntity,
          Error
        >(async (): Promise<ReelEntity> => {
          return this.reelRepository
            .getEntityManager()
            .fork()
            .findOneOrFail(ReelEntity, {
              contentSlug: CONTENT_SLUG,
              contentType: ContentType.SHOW,
              dialect: CONTENT_DIALECT,
              status: ReelStatusEnum.PUBLISHED,
            });
        });

        if (reelError) {
          return;
        }

        const score = this.contentStaticalScore(showData, showDataList);
        await this.reelsRecommendationService.addReelStaticalScore(
          reel._id.toString(),
          score,
          reel.dialect,
        );
      }),
    );
  }

  private async processSimilarityData() {
    const genres = await this.genreRepository
      .getEntityManager()
      .fork()
      .find(
        GenreEntity,
        {
          status: ContentStatus.ACTIVE,
        },
        {
          fields: ['hindiName', 'name'],
        },
      );
    const ALL_POSSIBLE_GENRES_HINDI = genres.map((genre) => genre.hindiName);
    const ALL_POSSIBLE_GENRES_ENGLISH = genres.map((genre) => genre.name);
    const shows = await this.showRepository.find(
      {
        displayLanguage: Lang.HIN,
        status: ContentStatus.ACTIVE,
      },
      ['slug', 'genreList', 'displayLanguage', 'language'],
      { lean: true },
    );
    console.log('shows', shows?.length);
    const movies = await this.episodeRepository.find(
      {
        displayLanguage: Lang.HIN,
        status: ContentStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      ['slug', 'genreList', 'displayLanguage', 'language'],
      { lean: true },
    );
    console.log('movies', movies?.length);

    const allContent = [
      ...(shows?.map((show) => ({ ...show, type: ContentType.SHOW })) || []),
      ...(movies?.map((movie) => ({ ...movie, type: ContentType.MOVIE })) ||
        []),
    ];
    let i = 0;
    while (i < allContent.length) {
      const contentA = allContent[i];
      const contentADialect = contentA.language;
      try {
        const vector1 = this.vectorUtils.createVector(
          contentA.genreList.map((genre) => genre.name),
          contentA.displayLanguage === Lang.HIN
            ? ALL_POSSIBLE_GENRES_HINDI
            : ALL_POSSIBLE_GENRES_ENGLISH,
        );
        allContent.forEach((contentB) => {
          if (contentA.slug === contentB.slug) return;
          const contentBDialect = contentB.language;
          if (contentADialect !== contentBDialect) return;
          const vector2 = this.vectorUtils.createVector(
            contentB.genreList.map((genre) => genre.name),
            contentB.displayLanguage === Lang.HIN
              ? ALL_POSSIBLE_GENRES_HINDI
              : ALL_POSSIBLE_GENRES_ENGLISH,
          );
          const similarity = this.vectorUtils.cosineSimilarityVector(
            vector1,
            vector2,
          );
          const contentAKey = `${contentA.type}_${contentA.slug}`;
          const contentBKey = `${contentB.type}_${contentB.slug}`;
          if (similarity * 100 > 0) {
            this.redisService.zadd(
              `${contentADialect}:similarity:${contentAKey}`,
              similarity * 100,
              `${contentB.type}_${contentB.slug}`,
            );
            this.redisService.zadd(
              `${contentBDialect}:similarity:${contentBKey}`,
              similarity * 100,
              `${contentA.type}_${contentA.slug}`,
            );
          }
        });
      } catch (e) {
        this.logger.error(
          { error: e },
          `Error processing similarity data for content ${contentA.slug}`,
        );
      }

      i++;
    }

    return true;
  }

  async process({ data }: Job<ContentQueuePayload>) {
    this.logger.log(`Processing queue:${QUEUES.CONTENTS} key:${data.key}`);
    return this.handleContentJob(data);
  }
}
