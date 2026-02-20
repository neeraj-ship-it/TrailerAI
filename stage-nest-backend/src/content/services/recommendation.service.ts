import { Injectable, Logger } from '@nestjs/common';

import { tracer } from 'dd-trace';

import { json } from 'typia';

import {
  IPlatterResponse,
  PlatterResponseDto,
} from '../interfaces/content.interface';
import { MovieService } from './movies.service';
import { ShowsService } from './shows.services';
import { Dialect, Lang, OS, Platform } from '@app/common/enums/app.enum';
import {
  HomePageContentType,
  IHomePageRowData,
} from '@app/common/interfaces/homepage.interface';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import {
  Events,
  NcantoPanelFetchedEvent,
} from '@app/events/interfaces/events.interface';
import { RedisKeyBuilders } from '@app/redis';
import { ComplexRedisService } from '@app/redis/stores/complex-redis.service';
import { APP_CONFIGS } from 'common/configs/app.config';
import { StringConstants } from 'common/constants/string.constant';
import { DDMetric } from 'common/dtos/dd.dto';
import { CombinedPlatterType } from 'common/entities/combined-platter.entity';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { ContentType } from 'common/enums/common.enums';
import { NcantoHomePagePanelResponseDto } from 'common/interfaces/INcantoResponse';
import { CombinedPlatterRepository } from 'common/repositories/combinedPlatter.entity';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';
import { ShowRepository } from 'src/content/repositories/show.repository';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly ncantoUtils: NcantoUtils,
    private readonly showRepository: ShowRepository,
    private readonly episodeRepository: EpisodesRepository,
    private readonly showService: ShowsService,
    private readonly movieService: MovieService,
    private readonly redisService: ComplexRedisService,
    private readonly combinedPlatterRepository: CombinedPlatterRepository,
    private readonly eventService: EventService,
  ) {}

  private filterPlatterByTypeAndFormat(
    platterListing: PlatterResponseDto[],
    type?: ContentType,
    format?: ContentFormat,
  ): PlatterResponseDto[] {
    return platterListing.filter((item) => {
      if (!type) return true;

      if (type === ContentType.MOVIE) {
        return item.contentType === ContentType.MOVIE;
      }

      if (type === ContentType.SHOW) {
        if (format === ContentFormat.MICRO_DRAMA) {
          return (
            item.contentType === ContentType.SHOW &&
            item.format === ContentFormat.MICRO_DRAMA
          );
        }

        return (
          item.contentType === ContentType.SHOW &&
          item.format === ContentFormat.STANDARD
        );
      }

      return true;
    });
  }

  private async getAssets(
    context: string,
    subscriber: string,
    dialect: Dialect,
  ) {
    const key = RedisKeyBuilders.recommendationRow.row({
      dialect,
      rowKey: context,
      userId: subscriber,
    });

    const assetIds = await this.redisService.smembers(key);

    return assetIds;
  }

  /**
   * Get Randeep Hooda's favorite content row
   */
  /**
   * Common method to fetch celebrity favorite content row
   */
  private async getCelebrityFavoriteRow(
    dialect: Dialect,
    lang: Lang,
    slugs: string[],
    options?: {
      movieFilters?: Record<string, unknown>;
      showFilters?: Record<string, unknown>;
    },
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    const baseMovieFilter = {
      displayLanguage: lang,
      language: dialect,
      slug: { $in: slugs },
      ...options?.movieFilters,
    };

    const baseShowFilter = {
      displayLanguage: lang,
      language: dialect,
      slug: { $in: slugs },
      ...options?.showFilters,
    };

    const [movies, shows] = await Promise.all([
      this.episodeRepository.find(
        baseMovieFilter,
        [
          '_id',
          'title',
          'language',
          'displayLanguage',
          'slug',
          'thumbnail',
          'releaseDate',
          'selectedPeripheral',
          'genreList',
          'duration',
          'complianceRating',
          'description',
        ],
        { cache: { enabled: true }, lean: true },
      ),
      this.showRepository.find(
        baseShowFilter,
        [
          '_id',
          'title',
          'language',
          'slug',
          'displayLanguage',
          'thumbnail',
          'releaseDate',
          'selectedPeripheral',
          'genreList',
          'duration',
          'complianceRating',
          'description',
        ],
        { cache: { enabled: true }, lean: true },
      ),
    ]);

    const rowContentData: IHomePageRowData[] = [
      ...(shows?.map((show) => ({
        _id: show._id,
        complianceRating: show.complianceRating,
        contentType: HomePageContentType.SHOW,
        description: show.description,
        duration: show.duration,
        genreList: show.genreList,
        releaseDate: show.releaseDate?.toString() || '',
        selectedPeripheral: show?.selectedPeripheral,
        slug: show.slug,
        thumbnail: show.thumbnail,
        title: show.title,
      })) || []),
      ...(movies?.map((movie) => ({
        _id: movie._id,
        complianceRating: movie.complianceRating,
        contentType: HomePageContentType.MOVIE,
        description: movie.description,
        duration: movie.duration,
        genreList: movie.genreList,
        releaseDate: movie.releaseDate?.toString() || '',
        selectedPeripheral: movie?.selectedPeripheral,
        slug: movie.slug,
        thumbnail: movie.thumbnail,
        title: movie.title,
      })) || []),
    ];

    return {
      data: rowContentData.length < 3 ? [] : rowContentData,
      responseMessage: 'success',
    };
  }

  private getNewDialectAndLang(cacheKey: string): {
    dialect: Dialect;
    lang: Lang;
  } {
    const [newDialect, newLang] = cacheKey?.split('_') || [];

    return {
      dialect: newDialect ? (newDialect as Dialect) : Dialect.HAR,
      lang: newLang ? (newLang as Lang) : Lang.HIN,
    };
  }

  private isTestNumber(subscriber: string): boolean {
    return subscriber.startsWith(APP_CONFIGS.PLATFORM.TEST_NUMBERS_PATTERN);
  }

  private async processAsset(
    assetId: string,
    lang: Lang,
  ): Promise<IHomePageRowData | null> {
    const [slug, type] = assetId?.split('_') || [];

    if (type === 'SHOW') {
      return await this.showRepository.getShowInHomePageResponse(lang, slug);
    }
    if (type === 'MOVIE') {
      return await this.episodeRepository.getMovieInHomePageResponse(
        lang,
        slug,
      );
    }
    return null;
  }

  private async processAssetForPlatter(
    assetId: string,
    lang: Lang,
    dialect: Dialect,
  ): Promise<PlatterResponseDto | null> {
    const [slug, type] = assetId?.split('_') || [];
    if (type === 'SHOW') {
      const show = await this.showService.getShowPlatterResponse(
        lang,
        slug,
        dialect,
      );
      if (show) {
        return {
          ...show,
          contentType: 'show',
          id: show._id,
          isComingSoon: show.isComingSoon ? 1 : 0,
        };
      }
    }
    if (type === 'MOVIE') {
      const movie = await this.movieService.getMoviePlatterResponse(
        lang,
        slug,
        dialect,
      );
      if (movie) {
        return {
          ...movie,
          contentType: 'individual',
          id: movie._id,
        };
      }
    }
    return null;
  }

  private sendNcantoPanelFetchedEvent(
    subscriber: string,
    dialect: Dialect,
    city: string,
    panels: NcantoPanelFetchedEvent['payload']['panels'],
  ): void {
    try {
      const event: NcantoPanelFetchedEvent = {
        app_client_id: null,
        key: Events.NCANTO_PANEL_FETCHED,
        os: OS.OTHER,
        payload: {
          city,
          dialect,
          panels,
        },
        user_id: subscriber,
      };

      this.eventService.trackEvent(event);

      this.logger.log(
        { panelCount: panels.length, subscriber },
        'Successfully sent ncanto_panel_fetched event',
      );
    } catch (error) {
      this.logger.warn(
        { error, subscriber },
        'Failed to create ncanto_panel_fetched event',
      );
    }
  }

  async checkNcantoSubscription(subscriber: string) {
    return this.ncantoUtils.checkSubscription(subscriber);
  }

  async fetchPanelRecommendations(
    subscriber: string,
    dialect: Dialect,
    city: string,
  ): Promise<NcantoHomePagePanelResponseDto> {
    const panelKey = RedisKeyBuilders.recommendationRow.panel({
      dialect: dialect,
      userId: subscriber,
    });
    const cacheData = await this.redisService.get(panelKey);

    if (cacheData) {
      const panelHomePageResponse: NcantoHomePagePanelResponseDto =
        json.assertParse<NcantoHomePagePanelResponseDto>(cacheData);
      return panelHomePageResponse;
    }

    const panelData = await this.ncantoUtils.getPanelRecommendations(
      subscriber,
      dialect,
      city,
      true,
    );

    const { PANEL_CACHE_TTL, ROW_CACHE_TTL } = APP_CONFIGS.NCANTO;

    const pipeline = await this.redisService.getPipeline();
    const panelsForEvent: NcantoPanelFetchedEvent['payload']['panels'] = [];

    for (const panel of panelData.panelRecommendations) {
      const key = RedisKeyBuilders.recommendationRow.row({
        dialect: dialect,
        rowKey: panel.contextId,
        userId: subscriber,
      });

      const assetIds = panel.recommendations
        .map((rec) => rec.asset.assetId)
        .filter((id): id is string => id !== undefined);

      if (assetIds.length === 0) continue;

      pipeline.del(key);
      pipeline.sadd(key, ...assetIds);
      pipeline.expire(key, ROW_CACHE_TTL);

      // Extract slugs from assetIds (format: {slug}_{type})
      const slugs = assetIds.map((id) => id.split('_')[0]);

      panelsForEvent.push({
        context_name: panel.contextNames.en ?? '',
        slugs,
      });
    }

    const panelHomePageResponse = {
      panelRecommendations: panelData.panelRecommendations.map((panel) => ({
        contextId: panel.contextId,
        contextName: panel.contextNames.en ?? '',
      })),
    };
    pipeline.set(
      panelKey,
      json.stringify(panelHomePageResponse),
      'EX',
      PANEL_CACHE_TTL,
    );

    await pipeline.exec();

    // Send event to RudderStack for analytics
    this.sendNcantoPanelFetchedEvent(subscriber, dialect, city, panelsForEvent);

    return panelHomePageResponse;
  }

  async getDefaultFallbackPlatter(
    dialect: Dialect,
    lang: Lang,
    platform: Platform,
    os: OS,
    type?: ContentType,
    format?: ContentFormat,
  ): Promise<IPlatterResponse> {
    const assetIds = [];

    const combinedPlatter = await this.combinedPlatterRepository.findOneOrFail(
      {
        dialect,
        lang,
        type: CombinedPlatterType.DN,
      },
      {
        cache: 60 * 60 * 1000, // 1 hour
        failHandler: () => Errors.PLATTER.NOT_FOUND(),
      },
    );

    assetIds.push(
      ...combinedPlatter.all.map((item) => {
        const type =
          item.type === ContentType.SHOW || !item.type ? 'SHOW' : 'MOVIE';
        return `${item.slug}_${type}`;
      }),
    );

    const platterListing = (
      await Promise.all(
        assetIds.map((assetId) =>
          this.processAssetForPlatter(assetId, lang, dialect),
        ),
      )
    ).filter((item): item is PlatterResponseDto => {
      if (!item) return false;
      const isMicroDrama = item?.format === ContentFormat.MICRO_DRAMA;
      const microdramaFiltering = isMicroDrama
        ? platform === Platform.APP && os === OS.ANDROID
        : true;
      return microdramaFiltering;
    });

    if (platterListing.length === 0) {
      tracer.dogstatsd.increment(
        DDMetric.RecommendationPlatterFallbackEmpty,
        1,
        {
          function: 'getplatterFromNcanto',
          service: RecommendationService.name,
        },
      );
    }

    const filteredPlatterListing = this.filterPlatterByTypeAndFormat(
      platterListing,
      type,
      format,
    );

    return {
      data: {
        label: 'Platter',
        platterListing: filteredPlatterListing,
        referralWidgetId: 4,
      },
      responseMessage: 'Success',
    };
  }

  async getLatestContentRow(
    dialect: Dialect,
    lang: Lang,
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    const twoMonthsAgo = new Date(
      Date.now() - APP_CONFIGS.NCANTO.LATEST_CONTENT_CUTOFF_TIME,
    );

    const latestMovies = await this.episodeRepository.find(
      {
        createdAt: { $gte: twoMonthsAgo },
        displayLanguage: lang,
        language: dialect,
        status: EpisodeStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      [
        '_id',
        'title',
        'language',
        'displayLanguage',
        'slug',
        'thumbnail',
        'releaseDate',
        'selectedPeripheral',
        'genreList',
        'duration',
        'complianceRating',
        'description',
      ],
      {
        cache: { enabled: true },
        lean: true,
        limit: 10,
        sort: { createdAt: -1 },
      },
    );
    const show = await this.showRepository.find(
      {
        createdAt: { $gte: twoMonthsAgo },
        displayLanguage: lang,
        format: ContentFormat.STANDARD,
        language: dialect,
        status: ShowStatus.ACTIVE,
      },
      [
        '_id',
        'title',
        'language',
        'slug',
        'displayLanguage',
        'thumbnail',
        'releaseDate',
        'selectedPeripheral',
        'genreList',
        'duration',
        'complianceRating',
        'description',
      ],
      {
        cache: { enabled: true },
        lean: true,
        limit: 10,
        sort: { createdAt: -1 },
      },
    );

    const rowContentData: IHomePageRowData[] = [];

    show?.forEach((show) => {
      const rowData: IHomePageRowData = {
        _id: show._id,
        complianceRating: show.complianceRating,
        contentType: HomePageContentType.SHOW,
        description: show.description,
        duration: show.duration,
        genreList: show.genreList,
        releaseDate: show.releaseDate?.toString() || '',
        selectedPeripheral: show?.selectedPeripheral,
        slug: show.slug,
        thumbnail: show.thumbnail,
        title: show.title,
      };
      rowContentData.push(rowData);
    });
    latestMovies?.forEach((movie) => {
      const rowData: IHomePageRowData = {
        _id: movie._id,
        complianceRating: movie.complianceRating,
        contentType: HomePageContentType.MOVIE,
        description: movie.description,
        duration: movie.duration,
        genreList: movie.genreList,
        releaseDate: movie.releaseDate?.toString() || '',
        selectedPeripheral: movie?.selectedPeripheral,
        slug: movie.slug,
        thumbnail: movie.thumbnail,
        title: movie.title,
      };
      rowContentData.push(rowData);
    });

    const recommendedRowPercentage = (rowContentData.length / 20) * 100;
    tracer.dogstatsd.gauge(
      DDMetric.RecommendationRowRate,
      recommendedRowPercentage,
      {
        dialect,
        rowKey: StringConstants.MO_NewReleases_Placeholder,
        service: RecommendationService.name,
      },
    );

    return {
      data: rowContentData.length < 3 ? [] : rowContentData,
      responseMessage: 'success',
    };
  }

  /**
   * Get Neeraj Chopra Ki Pasand content row
   */
  async getNeerajChopraKiPasandRow(
    dialect: Dialect,
    lang: Lang,
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    return this.getCelebrityFavoriteRow(
      dialect,
      lang,
      StringConstants.NEERAJ_CHOPRA_KI_PASAND_SLUGS,
      {
        movieFilters: {
          status: EpisodeStatus.ACTIVE,
          type: ContentType.MOVIE,
        },
        showFilters: {
          format: ContentFormat.STANDARD,
          status: ShowStatus.ACTIVE,
        },
      },
    );
  }

  async getplatterFromNcanto(
    context: string,
    subscriber: string,
    dialect: Dialect,
    lang: Lang,
    platform: Platform,
    os: OS,
    type?: ContentType,
    format?: ContentFormat,
  ): Promise<IPlatterResponse> {
    // Skip ncanto call for test numbers and return default fallback platter
    if (this.isTestNumber(subscriber)) {
      this.logger.log(
        { subscriber },
        'Test number detected, returning default fallback platter',
      );
      return this.getDefaultFallbackPlatter(
        dialect,
        lang,
        platform,
        os,
        type,
        format,
      );
    }

    const assetIds = await this.getAssets(context, subscriber, dialect);

    const platterListing = (
      await Promise.all(
        assetIds.map((assetId) =>
          this.processAssetForPlatter(assetId, lang, dialect),
        ),
      )
    ).filter((item): item is PlatterResponseDto => {
      if (!item) return false;
      const isMicroDrama = item?.format === ContentFormat.MICRO_DRAMA;
      const microdramaFiltering = isMicroDrama
        ? platform === Platform.APP && os === OS.ANDROID
        : true;
      return microdramaFiltering;
    });

    if (platterListing.length === 0) {
      tracer.dogstatsd.increment(DDMetric.RecommendationPlatterEmpty, 1, {
        service: RecommendationService.name,
        subscriber,
      });
      return this.getDefaultFallbackPlatter(
        dialect,
        lang,
        platform,
        os,
        type,
        format,
      );
    }
    const filteredPlatterListing = this.filterPlatterByTypeAndFormat(
      platterListing,
      type,
      format,
    );

    return {
      data: {
        label: 'Platter',
        platterListing: filteredPlatterListing,
        referralWidgetId: 4,
      },
      responseMessage: 'Success',
    };
  }

  async getRandeepHoodaFavoriteRow(
    dialect: Dialect,
    lang: Lang,
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    return this.getCelebrityFavoriteRow(
      dialect,
      lang,
      StringConstants.RANDEEP_HOODA_FAVORITE_SLUGS,
    );
  }

  async getRecommendationRow(
    context: string,
    subscriber: string,
    dialect: Dialect,
    lang: Lang,
  ) {
    const assetIds = await this.getAssets(context, subscriber, dialect);

    const results = await Promise.all(
      assetIds.map((assetId) => this.processAsset(assetId, lang)),
    );

    this.handleRowMonitoring(
      assetIds.length,
      results.length,
      dialect,
      subscriber,
      context,
    );

    return results.filter(
      (result): result is IHomePageRowData => result !== null,
    );
  }

  async getRowData(
    context: string,
    subscriber: string,
    dialect: Dialect,
    lang: Lang,
    retry = false,
    cacheKey?: string,
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    if (APP_CONFIGS.NCANTO.CUSTOM_ROWS.includes(context))
      return this.handleCustomRow(context, dialect, lang);

    const recommendations = await this.getRecommendationRow(
      context,
      subscriber,
      dialect,
      lang,
    );

    if (recommendations.length === 0) {
      if (retry && cacheKey) {
        const { dialect: newDialect, lang: newLang } =
          this.getNewDialectAndLang(cacheKey);
        return this.getRowData(
          context,
          subscriber,
          newDialect,
          newLang,
          false,
          cacheKey,
        );
      }
    }
    return { data: recommendations, responseMessage: 'success' };
  }

  async handleCustomRow(
    context: string,
    dialect: Dialect,
    lang: Lang,
  ): Promise<{ data: IHomePageRowData[]; responseMessage: string }> {
    switch (context) {
      case StringConstants.MO_NewReleases_Placeholder:
        return this.getLatestContentRow(dialect, lang);
      case StringConstants.MO_RandeepHooda_Favorite_Placeholder:
        return this.getRandeepHoodaFavoriteRow(dialect, lang);
      case StringConstants.MO_NeerajChopraKiPasand_Placeholder:
        return this.getNeerajChopraKiPasandRow(dialect, lang);
      default:
        return { data: [], responseMessage: 'success' };
    }
  }

  async handleRowMonitoring(
    assetIdsLength: number,
    resultsLength: number,
    dialect: Dialect,
    subscriber: string,
    context: string,
  ) {
    const maxRowCount = 20;
    const ncantoRowPercentage = (assetIdsLength / maxRowCount) * 100;
    const recommendedRowPercentage = (resultsLength / maxRowCount) * 100;
    const payload = {
      dialect,
      rowKey: context,
      service: RecommendationService.name,
    };

    tracer.dogstatsd.gauge(
      DDMetric.NcantoRowRate,
      ncantoRowPercentage,
      payload,
    );
    tracer.dogstatsd.gauge(
      DDMetric.RecommendationRowRate,
      recommendedRowPercentage,
      payload,
    );

    if (resultsLength !== 0) return;

    if (assetIdsLength === 0) {
      const panelKey = RedisKeyBuilders.recommendationRow.panel({
        dialect: dialect,
        userId: subscriber,
      });
      const cacheData = await this.redisService.get(panelKey);

      const panelExists = cacheData !== null;

      const type = panelExists
        ? DDMetric.NcantoRecommendationRowEmpty
        : DDMetric.RecommendationRowCacheEmpty;

      tracer.dogstatsd.increment(type, 1, payload);

      return;
    }

    tracer.dogstatsd.increment(DDMetric.RecommendationRowEmpty, 1, payload);
  }
}
