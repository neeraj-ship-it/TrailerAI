import { Inject, Injectable } from '@nestjs/common';

import {
  CONTENT_FORMAT_ENUMS,
  PROFILE_SELECTION_CONTENT_DATA,
} from '../constants/content.constants';
import { PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT } from '../constants/content.constants';
import { ProfileSelectionContentDataResponseDto } from '../dto/allContent.response.dto';
import {
  ChatbotAssetsResponseDto,
  ContentAssetsResponseDto,
} from '../dto/contentAsset.response.dto';
import { GroupByGenreResponseDto } from '../dto/getGenreWiseData.response.dto';
import {
  MicroDramaResponseDto,
  MicroDramaDto,
  SortBy,
  sortOrderEnum,
  WatchFilterEnum,
} from '../dto/microDrama.response.dto';
import {
  PaymentSuccessPageRecommendedContentDto,
  PaymentSuccessPageRecommendedContentParams,
  PromotionClipResponseDto,
} from '../dto/promotionClip.response.dto';
import {
  SlugByContentIdRequestDto,
  SlugByContentIdResponseDto,
} from '../dto/slugByContent.dto';
import { EpisodeType } from '../entities/episodes.entity';
import { ContentFormat } from '../entities/show.entity';
import { organizeContentByGenre } from '../helpers/genre.helper';
import {
  ContentSpecificPromotionClip,
  PromotionClipDto,
  PromotionClipParams,
} from '../interfaces/promotionClip.interface';
import { AssetsV2Repository } from '../repositories/assetsV2.repository';
import { ContentAssetsRepository } from '../repositories/contentAssets.repository';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ShowRepository } from '../repositories/show.repository';
import { UpcomingSectionRepository } from '../repositories/upcomingSection.repository';
import { SpecialAccessService } from './specialAccess.service';
import { FeatureEnum } from '@app/common/entities/assetsV2.entity';
import {
  AssetsPlatforms,
  Dialect,
  DialectName,
  Lang,
  Platform,
} from '@app/common/enums/app.enum';
import { ContentType, ContentTypeV2 } from '@app/common/enums/common.enums';
import { generateWebURLSlug } from '@app/common/helpers/displaySlug.helper';
import { LanguageHelper } from '@app/common/helpers/language.helper';
import { mergeAssets } from '@app/common/utils/asset-merger.utils';
import { isFeatureEligible } from '@app/common/utils/feature-eligibility.utils';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ContentSensorRedisStore } from '@app/redis';
import {
  MICRODRAMA_CATEGORY_FILTER_COPIES,
  PROMOTION_CLIP_COPIES,
  RECOMMENDED_CONTENT_COPIES,
} from 'common/constants/copies.constant';
import { WEB_CONSTANTS } from 'common/constants/web.constants';
import { AssetsV2 } from 'common/entities/assetsV2.entity';
import { ContentAssets } from 'common/entities/contentAssets.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { convertDurationToHoursAndMinutes } from 'common/helpers/dateTime.helper';
import { getDateIST } from 'common/helpers/dateTime.helper';
import {
  HomePageContentType,
  HomePageResponseMessage,
  IHomePageRowData,
  IHomePageRowResponse,
} from 'common/interfaces/homepage.interface';
import {
  ChatbotAssetType,
  ContentAssetContentType,
} from 'common/schema/contentAssets.schema';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';
import { Context } from 'libs/auth/src';
import { ImageOrientation } from 'src/cms/interfaces/files.interface';
interface FilteredGenreData {
  dialect: Dialect;
  format?: ContentFormat;
  genreId?: number;
  lang: Lang;
  type?: ContentType;
}

@Injectable()
export class ContentService {
  constructor(
    @Inject() private upcomingSectionRepository: UpcomingSectionRepository,
    @Inject() private showRepository: ShowRepository,
    @Inject() private episodeRepository: EpisodesRepository,
    @Inject() private errorHandler: ErrorHandlerService,
    @Inject() private contentSensorRedisStore: ContentSensorRedisStore,
    @Inject() private contentAssetsRepository: ContentAssetsRepository,
    @Inject() private assetsV2Repository: AssetsV2Repository,
    @Inject() private specialAccessService: SpecialAccessService,
  ) {}

  /**
   * Builds redirect URL for character chat page
   */
  private async getCharacterRedirectUrl(
    contentId: number,
    contentType: ContentAssetContentType,
    dialect: Dialect,
    lang: Lang,
  ): Promise<string> {
    // Get slug based on content type
    let slug: string | undefined;

    if (contentType === ContentAssetContentType.SHOW) {
      const show = await this.showRepository.findActiveShowById(
        { showId: contentId },
        ['slug'],
      );
      slug = show?.slug;
    } else {
      const movie = await this.episodeRepository.findOne(
        { _id: contentId },
        ['slug'],
        { lean: true },
      );
      slug = movie?.slug;
    }

    if (!slug) {
      return '';
    }

    // Convert dialect to URL-friendly name
    const dialectName =
      DialectName[dialect as keyof typeof DialectName] || dialect;

    // Convert lang to URL format
    const urlLang = lang === Lang.HIN ? 'hi' : 'en';

    // Convert content type to URL format
    const urlContentType =
      contentType === ContentAssetContentType.MOVIE ? 'movie' : 'show';

    return `${WEB_CONSTANTS.baseUrl}/${urlLang}/${dialectName}/${urlContentType}/${slug}/characters`;
  }

  private async getCommitmentBoostDiscoveryFallbackAsset(
    contentId: number,
    contentType: ContentAssetContentType,
    feature: FeatureEnum = FeatureEnum.COMMITMENT_BOOST_DISCOVERY,
  ): Promise<Partial<ContentAssets>> {
    let asset;
    if (contentType === ContentAssetContentType.SHOW) {
      const showAssets = await this.errorHandler.raiseErrorIfNullAsync(
        this.showRepository.findActiveShowById({ showId: contentId }, [
          '_id',
          'thumbnail',
        ]),
        Errors.SHOW.NOT_FOUND(),
      );

      asset = MediaFilePathUtils.generateHorizontal16x9ThumbnailURL({
        contentType: ContentType.SHOW,
        platform: Platform.APP,
        thumbnail: showAssets.thumbnail,
      });
    } else {
      const movieAssets = await this.errorHandler.raiseErrorIfNullAsync(
        this.episodeRepository.findActiveMovieById(contentId, [
          '_id',
          'thumbnail',
        ]),
        Errors.EPISODE.NOT_FOUND(),
      );

      asset = MediaFilePathUtils.generateHorizontal16x9ThumbnailURL({
        contentType: ContentType.MOVIE,
        platform: Platform.APP,
        thumbnail: movieAssets.thumbnail,
      });
    }

    return {
      _id: contentId,
      [feature]: {
        drawer: {
          asset_type: ChatbotAssetType.IMAGE,
          asset_url: asset,
        },
      },
    };
  }

  private async getFilteredGenreDataForMicroDramas({
    dialect,
    format,
    genreId,
    lang,
    type,
  }: FilteredGenreData) {
    if (
      type === ContentType.MOVIE ||
      (type === ContentType.SHOW && format !== ContentFormat.MICRO_DRAMA)
    ) {
      return [];
    }
    const showFilter = {
      displayLanguage: lang,
      episodeCount: { $gt: 1 },
      format: ContentFormat.MICRO_DRAMA,
      language: dialect,
      status: ShowStatus.ACTIVE,
      ...(genreId && { 'genreList.id': genreId }),
    };

    const showsList = await this.showRepository.find(
      showFilter,
      [
        '_id',
        'title',
        'thumbnail',
        'genreList',
        'slug',
        'format',
        'duration',
        'complianceRating',
        'description',
        'selectedPeripheral',
      ],
      {
        cache: {
          enabled: true,
        },
        lean: true,
        sort: { createdAt: -1 },
      },
    );
    return (showsList || []).map((showData) => ({
      ...showData,
      contentType: ContentType.SHOW,
    }));
  }

  private async getFilteredGenreDataForMovies({
    dialect,
    genreId,
    lang,
    type = ContentType.MOVIE, // Default to fetch movies/shows both when type is not provided
  }: FilteredGenreData) {
    if (type !== ContentType.MOVIE) return [];

    const movieFilter = {
      displayLanguage: lang,
      format: CONTENT_FORMAT_ENUMS.STANDARD,
      language: dialect,
      status: EpisodeStatus.ACTIVE,
      type: ContentType.MOVIE,
      ...(genreId && { 'genreList.id': genreId }),
    };

    const moviesList = await this.episodeRepository.find(
      movieFilter,
      [
        '_id',
        'title',
        'thumbnail',
        'genreList',
        'type',
        'createdAt',
        'slug',
        'duration',
        'complianceRating',
        'description',
        'selectedPeripheral',
      ],
      {
        cache: {
          enabled: true,
        },
        lean: true,
      },
    );

    const showFilter = {
      displayLanguage: lang,
      episodeCount: { $eq: 1 },
      format: CONTENT_FORMAT_ENUMS.STANDARD,
      language: dialect,
      status: ShowStatus.ACTIVE,
      ...(genreId && { 'genreList.id': genreId }),
    };

    const showsList = await this.showRepository.find(
      showFilter,
      [
        '_id',
        'title',
        'thumbnail',
        'genreList',
        'createdAt',
        'slug',
        'duration',
        'complianceRating',
        'description',
        'selectedPeripheral',
      ],
      {
        cache: {
          enabled: true,
        },
        lean: true,
      },
    );

    const combinedList = [
      ...(moviesList || []).map((movieData) => ({
        ...movieData,
        contentType: ContentType.MOVIE,
      })),
      ...(showsList || []).map((showData) => ({
        ...showData,
        contentType: ContentType.SHOW,
      })),
    ].sort((a, b) =>
      a.createdAt > b.createdAt ? 1 : a.createdAt < b.createdAt ? -1 : 0,
    );

    return combinedList;
  }

  private async getFilteredGenreDataForShows({
    dialect,
    format = ContentFormat.STANDARD,
    genreId,
    lang,
    type = ContentType.SHOW, // Default to fetch movies/shows both when type is not provided
  }: FilteredGenreData) {
    if (type !== ContentType.SHOW || format === ContentFormat.MICRO_DRAMA) {
      return [];
    }

    const showFilter = {
      displayLanguage: lang,
      episodeCount: { $gt: 1 },
      format: CONTENT_FORMAT_ENUMS.STANDARD,
      language: dialect,
      status: ShowStatus.ACTIVE,
      ...(genreId && { 'genreList.id': genreId }),
    };

    const showsList = await this.showRepository.find(
      showFilter,
      [
        '_id',
        'title',
        'thumbnail',
        'genreList',
        'slug',
        'format',
        'duration',
        'complianceRating',
        'description',
        'selectedPeripheral',
      ],
      {
        cache: {
          enabled: true,
        },
        lean: true,
        sort: { createdAt: -1 },
      },
    );

    return (showsList || []).map((showData) => ({
      ...showData,
      contentType: ContentType.SHOW,
    }));
  }

  private async promotionClipForMovie(contentId: number) {
    const movie = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findActiveMovieById(contentId, [
        'thumbnail',
        'title',
        '_id',
        'slug',
        'mediaList',
        'duration',
      ]),
      Errors.MOVIE.NOT_FOUND(),
    );
    const selectedClip =
      movie.mediaList?.find(
        (media) => media.mediaType === PeripheralMediaType.CLIP,
      ) || movie.mediaList?.[0];

    const { playbackURLH264 } =
      MediaFilePathUtils.generatePeripheralPlaybackURL({
        contentType: ContentType.MOVIE,
        hls265SourceLink: selectedClip?.visionularHlsH265?.hlsSourcelink || '',
        hlsSourceLink: selectedClip?.visionularHls?.hlsSourcelink || '',
        slug: movie.slug,
      });

    return {
      ...movie,
      playbackURL: playbackURLH264,
    };
  }

  private async promotionClipForShow(contentId: number) {
    const show = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findActiveShowById({ showId: contentId }, [
        '_id',
        'slug',
        'mediaList',
        'thumbnail',
        'duration',
        'title',
        'format',
      ]),
      Errors.SHOW.NOT_FOUND(`Show not found for promotion clip: ${contentId}`),
    );

    const selectedClip =
      show.mediaList?.find(
        (media) => media.mediaType === PeripheralMediaType.CLIP,
      ) || show.mediaList?.[0];

    const { playbackURLH264 } =
      MediaFilePathUtils.generatePeripheralPlaybackURL({
        contentType: ContentType.SHOW,
        hls265SourceLink: selectedClip?.visionularHlsH265?.hlsSourcelink || '',
        hlsSourceLink: selectedClip?.visionularHls?.hlsSourcelink || '',
        slug: show.slug,
      });
    return {
      ...show,
      playbackURL: playbackURLH264,
    };
  }

  async allContent({ meta: { appBuildNumber, dialect, platform } }: Context) {
    const showQuery: {
      language: Dialect;
      status: ShowStatus;
      referenceShowArr?: object;
      format?: ContentFormat;
    } = {
      language: dialect,
      status: ShowStatus.ACTIVE,
    };
    if (
      isFeatureEligible('SEASON', {
        buildNumber: appBuildNumber,
      }) ||
      platform === Platform.WEB
    ) {
      showQuery.referenceShowArr = { $size: 0 };
    }
    if (platform !== Platform.APP && platform !== Platform.WEB) {
      showQuery.format = ContentFormat.STANDARD;
    }

    const [shows, movies] = await Promise.all([
      this.showRepository.find(
        showQuery,
        [
          '_id',
          'title',
          'language',
          'displayLanguage',
          'thumbnail',
          'slug',
          'format',
        ],
        {
          cache: { enabled: true },
          lean: true,
          sort: { _id: -1 },
        },
      ),
      this.episodeRepository.find(
        {
          language: dialect,
          status: EpisodeStatus.ACTIVE,
          type: EpisodeType.Movie,
        },
        ['_id', 'title', 'language', 'displayLanguage', 'thumbnail', 'slug'],
        {
          cache: { enabled: true },
          lean: true,
          sort: { _id: -1 },
        },
      ),
    ]);

    const showsWithType = await Promise.all(
      (shows ?? []).map(async (show) => {
        let displayEnglishTitle = show.title;
        if (show.displayLanguage !== Lang.EN) {
          const englishShow = await this.showRepository.findOne(
            { displayLanguage: Lang.EN, slug: show.slug },
            ['title'],
            { cache: { enabled: true }, lean: true },
          );
          if (englishShow) {
            displayEnglishTitle = englishShow.title;
          }
        }

        return {
          ...show,
          displayEnglishTitle,
          displaySlug: generateWebURLSlug({
            contentId: show._id,
            contentName: displayEnglishTitle,
          }) as string,
          type: ContentType.SHOW,
        };
      }),
    );

    const moviesWithType = await Promise.all(
      (movies ?? []).map(async (movie) => {
        let displayEnglishTitle = movie.title;
        if (movie.displayLanguage !== Lang.EN) {
          const englishMovie = await this.episodeRepository.findOne(
            { displayLanguage: Lang.EN, slug: movie.slug },
            ['title'],
            { cache: { enabled: true }, lean: true },
          );
          if (englishMovie) {
            displayEnglishTitle = englishMovie.title;
          }
        }

        return {
          ...movie,
          displayEnglishTitle,
          displaySlug: generateWebURLSlug({
            contentId: movie._id,
            contentName: displayEnglishTitle,
          }) as string,
          type: ContentType.EPISODE,
        };
      }),
    );

    return { data: [...showsWithType, ...moviesWithType] };
  }

  async contentAssets(
    contentId: number,
    contentType: ContentAssetContentType,
    assetType: FeatureEnum,
    dialect: Dialect,
    language: Lang,
  ): Promise<ContentAssetsResponseDto> {
    let contentAssets;

    contentAssets = await this.contentAssetsRepository.findOne(
      { content_id: contentId, content_type: contentType },
      ['_id', assetType],
      {
        cache: { enabled: true },
        lean: true,
      },
    );

    if (
      !contentAssets ||
      (!contentAssets[assetType] &&
        (assetType === FeatureEnum.COMMITMENT_BOOST_DISCOVERY ||
          assetType === FeatureEnum.DISCOVERY_BOOST))
    ) {
      contentAssets = await this.getCommitmentBoostDiscoveryFallbackAsset(
        contentId,
        contentType,
        assetType,
      );
    }

    // Fetch AssetsV2 for static/platform-specific assets
    const assetsV2 = await this.assetsV2Repository.findByFeature(assetType, []);

    // If no assetsV2, return content asset only
    if (!assetsV2) {
      const asset = this.errorHandler.raiseErrorIfNull(
        contentAssets[assetType],
        Errors.CONTENT.ASSETS.NOT_FOUND(),
      );

      // Add redirect URL for chatbot assets
      if (assetType === FeatureEnum.CHATBOT) {
        const redirectUrl = await this.getCharacterRedirectUrl(
          contentId,
          contentType,
          dialect,
          language,
        );
        return {
          [assetType]: {
            ...(asset as ChatbotAssetsResponseDto),
            redirect_url: redirectUrl,
          },
        };
      }

      return { [assetType]: asset };
    }

    // Merge content-specific assets with static assets
    const mergedAssets = await this.mergeStaticAssetsWithContentAssets(
      assetsV2,
      contentAssets,
      assetType,
      dialect,
      language,
      AssetsPlatforms.COMMON,
    );

    // Extract the specific asset type from merged result
    const asset = this.errorHandler.raiseErrorIfNull(
      mergedAssets[assetType],
      Errors.CONTENT.ASSETS.NOT_FOUND(),
    );

    // Add redirect URL for chatbot assets
    if (assetType === FeatureEnum.CHATBOT) {
      const redirectUrl = await this.getCharacterRedirectUrl(
        contentId,
        contentType,
        dialect,
        language,
      );
      return {
        [assetType]: {
          ...(asset as ChatbotAssetsResponseDto),
          redirect_url: redirectUrl,
        },
      };
    }

    return {
      [assetType]: asset,
    };
  }

  async getMicroDramas(params: {
    dialect: Dialect;
    lang: Lang;
    sortOrder?: number;
    sortBy?: SortBy;
    isCached?: boolean;
    watchFilter?: WatchFilterEnum;
  }): Promise<MicroDramaResponseDto> {
    const { dialect, lang, sortBy, sortOrder, watchFilter } = params;
    const isCached = params.isCached ?? true;
    const sortOrderNumber =
      sortOrder === sortOrderEnum.ASC ? sortOrderEnum.ASC : sortOrderEnum.DESC;
    const sortByKey = sortBy === SortBy.ID ? SortBy.ID : SortBy.RELEASE_DATE;

    // If watchFilter is provided, use aggregation with $lookup to join airbyte collection
    if (watchFilter) {
      const shows = await this.showRepository.findMicroDramasWithWatchMetrics({
        dialect,
        isCached,
        lang,
        limit: 10,
        sortOrder: sortOrderNumber,
        watchFilter,
      });

      return {
        data: shows || [],
        responseMessage: 'Success',
      };
    }

    // Default behavior without watchFilter
    const shows = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.find(
        {
          displayLanguage: lang,
          format: CONTENT_FORMAT_ENUMS.MICRO_DRAMA,
          language: dialect,
          status: { $in: [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH] },
        },
        [
          'slug',
          '_id',
          'title',
          'thumbnail',
          'releaseDate',
          'description',
          'selectedPeripheral',
          'format',
        ],
        {
          cache: { enabled: isCached },
          lean: true,
          limit: 10,
          sort: { [sortByKey]: sortOrderNumber },
        },
      ),
      Errors.SHOW.MICRO_DRAMA_NOT_FOUND(),
    );

    return {
      data: shows,
      responseMessage: 'Success',
    };
  }

  async getPreviewContentRow(
    userId: string,
    dialect: Dialect,
    lang: Lang,
  ): Promise<IHomePageRowResponse> {
    const cohortUsers = await this.contentSensorRedisStore.getCohortUsers();
    const userIndex = cohortUsers.indexOf(userId);

    if (userIndex === -1)
      return {
        data: [],
        responseMessage: HomePageResponseMessage.SUCCESS,
      };

    const [showPreviewContentSlugs, moviePreviewContentSlugs] =
      await Promise.all([
        this.contentSensorRedisStore.listFilteredContentsSlugsInPreviewMode(
          dialect,
          ContentTypeV2.SHOW,
        ),
        this.contentSensorRedisStore.listFilteredContentsSlugsInPreviewMode(
          dialect,
          ContentTypeV2.MOVIE,
        ),
      ]);

    const [eligibleShowContentSlugs, eligibleMovieContentSlugs] =
      await Promise.all([
        this.contentSensorRedisStore.usersPartOfPreviewContents({
          dialect,
          slugs: showPreviewContentSlugs,
          type: ContentTypeV2.SHOW,
          userId,
        }),
        this.contentSensorRedisStore.usersPartOfPreviewContents({
          dialect,
          slugs: moviePreviewContentSlugs,
          type: ContentTypeV2.MOVIE,
          userId,
        }),
      ]);

    if (
      eligibleShowContentSlugs.length + eligibleMovieContentSlugs.length ===
      0
    )
      return {
        data: [],
        responseMessage: HomePageResponseMessage.SUCCESS,
      };

    const [showPreviewContent, moviePreviewContent] = await Promise.all([
      this.showRepository.find(
        {
          displayLanguage: lang,
          language: dialect,
          slug: { $in: eligibleShowContentSlugs },
          status: EpisodeStatus.PREVIEW_PUBLISHED,
        },
        [
          '_id',
          'title',
          'language',
          'displayLanguage',
          'thumbnail',
          'releaseDate',
          'slug',
        ],
        { cache: { enabled: true }, lean: true },
      ),
      this.episodeRepository.find(
        {
          displayLanguage: lang,
          language: dialect,
          slug: { $in: eligibleMovieContentSlugs },
          status: EpisodeStatus.PREVIEW_PUBLISHED,
        },
        [
          '_id',
          'title',
          'language',
          'displayLanguage',
          'thumbnail',
          'releaseDate',
          'slug',
        ],
        { cache: { enabled: true }, lean: true },
      ),
    ]);

    const rowContentData: IHomePageRowData[] = [];

    showPreviewContent?.forEach((show) => {
      const rowData: IHomePageRowData = {
        _id: show._id,
        contentType: HomePageContentType.SHOW,
        releaseDate: show.releaseDate?.toString() || '',
        slug: show.slug,
        thumbnail: show.thumbnail,
        title: show.title,
      };
      rowContentData.push(rowData);
    });
    moviePreviewContent?.forEach((movie) => {
      const rowData: IHomePageRowData = {
        _id: movie._id,
        contentType: HomePageContentType.MOVIE,
        releaseDate: movie.releaseDate?.toString() || '',
        slug: movie.slug,
        thumbnail: movie.thumbnail,
        title: movie.title,
      };
      rowContentData.push(rowData);
    });

    return {
      data: rowContentData,
      responseMessage: HomePageResponseMessage.SUCCESS,
    };
  }

  async getUpcomingSectionDetails({ meta: { dialect, lang } }: Context) {
    const currentDate = getDateIST(new Date());
    const referralWidgetId = 12;

    const mediaData =
      await this.upcomingSectionRepository.findUpcomingSectionMediaData(
        {
          currentDate,
          dialect,
          lang,
        },
        [
          'title',
          'releaseDate',
          'language',
          'displayLanguage',
          'displayMedia',
          'trailerReleaseDate',
          'contentType',
          'isLived',
          'artistList',
          'mediaList',
          'posterReleaseDate',
        ],
      );
    const posterData =
      await this.upcomingSectionRepository.findUpcomingSectionPosterData(
        {
          currentDate,
          dialect,
          lang,
        },
        [
          'title',
          'releaseDate',
          'language',
          'displayLanguage',
          'displayMedia',
          'trailerReleaseDate',
          'contentType',
          'isLived',
          'artistList',
          'mediaList',
          'posterReleaseDate',
        ],
      );

    const combineData = [...(mediaData || []), ...(posterData || [])];

    const homeCopy = LanguageHelper.loadHomeScreen(lang);

    return {
      comingSoonListing: combineData,
      label: homeCopy.homeAllTabFreemium.comingSoon,
      referralWidgetId,
    };
  }

  async groupByGenre({
    dialect,
    format = ContentFormat.STANDARD,
    genreId,
    lang,
    type,
  }: FilteredGenreData): Promise<GroupByGenreResponseDto> {
    const restrictToSelectedGenre = !!genreId;

    const [moviesList, showsList, microdramasList] = await Promise.all([
      this.getFilteredGenreDataForMovies({
        dialect,
        genreId,
        lang,
        type,
      }),
      this.getFilteredGenreDataForShows({
        dialect,
        format,
        genreId,
        lang,
        type,
      }),
      this.getFilteredGenreDataForMicroDramas({
        dialect,
        format,
        genreId,
        lang,
        type,
      }),
    ]);
    let top10Microdramas: MicroDramaDto[] = [];
    let trendingMicrodramas: MicroDramaDto[] = [];
    if (type === ContentType.SHOW && format === ContentFormat.MICRO_DRAMA) {
      const top10MicrodramasResponse = await this.getMicroDramas({
        dialect,
        isCached: false,
        lang,
        sortBy: SortBy.ID,
        sortOrder: sortOrderEnum.DESC,
      });
      const trendingMicrodramasResponse = await this.getMicroDramas({
        dialect,
        isCached: false,
        lang,
        sortBy: SortBy.ID,
        sortOrder: sortOrderEnum.ASC,
        watchFilter: WatchFilterEnum.UNIQUE_WATCHERS,
      });
      top10Microdramas = top10MicrodramasResponse.data.map((microdrama) => ({
        ...microdrama,
        contentType: ContentType.SHOW,
      }));
      trendingMicrodramas = trendingMicrodramasResponse.data.map(
        (microdrama) => ({
          ...microdrama,
          contentType: ContentType.SHOW,
        }),
      );
    }
    const genreWiseData = organizeContentByGenre({
      microdramas: microdramasList,
      moviesList: moviesList,
      restrictToSelectedGenre,
      selectedGenreId: genreId,
      showsList: showsList,
    });

    const microdramaCategoryFilterCopies =
      MICRODRAMA_CATEGORY_FILTER_COPIES[lang];
    return {
      genreWiseData,
      top10Microdramas: {
        data: top10Microdramas,
        title: microdramaCategoryFilterCopies.top10,
      },
      trendingMicrodramas: {
        data: trendingMicrodramas,
        title: microdramaCategoryFilterCopies.trending,
      },
    };
  }

  async mergeStaticAssetsWithContentAssets<T extends Partial<ContentAssets>>(
    assetsV2: AssetsV2,
    contentAssets: T,
    assetType: FeatureEnum,
    dialect: Dialect,
    language: Lang,
    platform: AssetsPlatforms = AssetsPlatforms.COMMON,
  ) {
    const staticAssets = this.specialAccessService.getKeyFromAssetsHelper(
      assetsV2,
      dialect,
      language,
      platform,
    );

    const contentAsset = contentAssets[assetType];
    const staticAsset = staticAssets[assetType];

    // Return content asset if no static asset exists
    if (!staticAsset) {
      return { [assetType]: contentAsset };
    }

    // Merge both assets (common keys are combined, not overwritten)
    return mergeAssets(
      { [assetType]: contentAsset },
      { [assetType]: staticAsset },
    );
  }

  async paymentSuccessPageRecommendedContent({
    dialect,
    lang,
    platform,
  }: PaymentSuccessPageRecommendedContentParams): Promise<
    PaymentSuccessPageRecommendedContentDto[]
  > {
    const assetsV2 = await this.assetsV2Repository.findByFeature(
      FeatureEnum.PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT,
      [],
    );

    let recommendedContentIds;

    if (assetsV2) {
      const assets = this.specialAccessService.getKeyFromAssetsHelper(
        assetsV2,
        dialect,
        lang,
        AssetsPlatforms.COMMON,
      );
      recommendedContentIds =
        assets.payment_success_page_recommended_content ||
        PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT[dialect][lang];
    } else {
      recommendedContentIds =
        PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT[dialect][lang];
    }

    // Fetch all content in parallel using existing helper methods
    const contentPromises = recommendedContentIds.map(async (item) => {
      const content =
        item.content_type === ContentType.MOVIE
          ? await this.promotionClipForMovie(item.content_id)
          : await this.promotionClipForShow(item.content_id);

      const actualContentType =
        item.content_type === ContentType.MOVIE
          ? ContentType.EPISODE
          : ContentType.SHOW;

      const result: PaymentSuccessPageRecommendedContentDto = {
        contentId: item.content_id,
        contentType: item.content_type,
        horizontalThumbnail:
          MediaFilePathUtils.generateHorizontal16x9ThumbnailURL({
            contentType: actualContentType,
            platform,
            thumbnail: content.thumbnail,
          }),
        title: content.title,
        trailerUrl: content.playbackURL || null,
        verticalThumbnail: MediaFilePathUtils.generateImageViewURLWithoutSize({
          contentType: actualContentType,
          fileName: content.thumbnail?.vertical?.ratio1?.sourceLink || '',
          orientation: ImageOrientation.VERTICAL,
        }),
      };

      return result;
    });

    const results = await Promise.all(contentPromises);

    return results.filter(
      (item): item is PaymentSuccessPageRecommendedContentDto => item !== null,
    );
  }

  async profileSelectionContentData(
    lang: Lang,
  ): Promise<ProfileSelectionContentDataResponseDto> {
    const contentData = PROFILE_SELECTION_CONTENT_DATA.CONTENT;
    const contentPromises = contentData.map(async (content) => {
      const { slug, type } = content;

      if (type === ContentType.SHOW) {
        const show = await this.showRepository.findOne(
          { displayLanguage: lang, slug },
          ['thumbnail', '_id'],
          { cache: { enabled: true }, lean: true },
        );
        return show ? { ...show, contentType: ContentType.SHOW } : null;
      } else if (type === ContentType.MOVIE) {
        const episode = await this.episodeRepository.findOne(
          { displayLanguage: lang, slug },
          ['thumbnail', '_id'],
          { cache: { enabled: true }, lean: true },
        );
        return episode ? { ...episode, contentType: ContentType.MOVIE } : null;
      }

      return null;
    });

    const results = await Promise.all(contentPromises);

    // Filter out null results (content not found)

    const filteredResults = results.filter((result) => result !== null);
    const resultsWithThumbnail = filteredResults.map((result) => ({
      _id: result._id,
      contentType: result.contentType,
      thumbnail: {
        horizontal: MediaFilePathUtils.generateImageViewURLWithoutSize({
          contentType:
            result.contentType === ContentType.SHOW
              ? ContentType.SHOW
              : ContentType.EPISODE,
          fileName: result.thumbnail.horizontal?.ratio1.sourceLink || '',
          orientation: ImageOrientation.HORIZONTAL,
        }),
        square: MediaFilePathUtils.generateImageViewURLWithoutSize({
          contentType:
            result.contentType === ContentType.SHOW
              ? ContentType.SHOW
              : ContentType.EPISODE,
          fileName: result.thumbnail.square?.ratio1.sourceLink || '',
          orientation: ImageOrientation.SQUARE,
        }),
        vertical: MediaFilePathUtils.generateImageViewURLWithoutSize({
          contentType:
            result.contentType === ContentType.SHOW
              ? ContentType.SHOW
              : ContentType.EPISODE,
          fileName: result.thumbnail.vertical?.ratio1?.sourceLink || '',
          orientation: ImageOrientation.VERTICAL,
        }),
      },
    }));

    return { data: { items: resultsWithThumbnail } };
  }

  async promotionClip({
    contentId,
    contentType,
    dialect,
    lang,
    platform,
  }: PromotionClipParams): Promise<PromotionClipResponseDto> {
    const fallbackClipDetails = PROMOTION_CLIP_COPIES[lang].generic;

    if (!contentId || !contentType) {
      return {
        ...fallbackClipDetails,
        recommended_content: await this.paymentSuccessPageRecommendedContent({
          dialect,
          lang,
          platform,
        }),
        recommended_content_copies: RECOMMENDED_CONTENT_COPIES[dialect][lang],
      };
    }

    const [contentSpecificClipDetails] = await this.errorHandler.try(
      async () => {
        return this.promotionClipForContent({
          contentId,
          contentType,
          lang,
          platform,
        });
      },
    );

    const recommendedContent = await this.paymentSuccessPageRecommendedContent({
      dialect,
      lang,
      platform,
    });

    return {
      ...fallbackClipDetails,
      ...contentSpecificClipDetails,
      recommended_content: recommendedContent,
      recommended_content_copies: RECOMMENDED_CONTENT_COPIES[dialect][lang],
    };
  }
  async promotionClipForContent({
    contentId,
    contentType,
    lang,
    platform,
  }: ContentSpecificPromotionClip): Promise<PromotionClipDto> {
    if (contentType === ContentType.MOVIE) {
      const movie = await this.promotionClipForMovie(contentId);
      return {
        descriptionText: PROMOTION_CLIP_COPIES[
          lang
        ].movie.descriptionText.replace(
          '%contentDuration%',
          convertDurationToHoursAndMinutes(movie.duration),
        ),
        duration: movie.duration,
        infoText: PROMOTION_CLIP_COPIES[lang].movie.infoText,
        playbackURL: movie.playbackURL,
        slug: movie.slug,
        // TODO: Move static text to get from assets
        thumbnailURL: MediaFilePathUtils.generateHorizontal16x9ThumbnailURL({
          contentType: ContentType.MOVIE,
          platform,
          thumbnail: movie.thumbnail,
        }),
        titleText: movie.title,
      };
    }

    const show = await this.promotionClipForShow(contentId);
    return {
      // TODO: Move static text to get from assets
      descriptionText: PROMOTION_CLIP_COPIES[lang].show.descriptionText.replace(
        '%contentDuration%',
        convertDurationToHoursAndMinutes(show.duration),
      ),
      duration: show.duration,
      infoText: PROMOTION_CLIP_COPIES[lang].show.infoText,
      playbackURL:
        show.format === ContentFormat.STANDARD ? show.playbackURL : '', //Don't play video for microdrama
      slug: show.slug,
      thumbnailURL: MediaFilePathUtils.generateHorizontal16x9ThumbnailURL({
        contentType: ContentType.SHOW,
        platform,
        thumbnail: show.thumbnail,
      }),
      titleText: show.title,
    };
  }
  async slugByContentId(
    query: SlugByContentIdRequestDto,
  ): Promise<SlugByContentIdResponseDto> {
    const { contentId, format } = query;

    if (format === ContentFormat.MICRO_DRAMA) {
      const show = await this.errorHandler.raiseErrorIfNullAsync(
        this.showRepository.findActiveShowById({ showId: contentId }, ['slug']),
        Errors.SHOW.NOT_FOUND(),
      );
      return { contentId, slug: show.slug };
    }

    const content = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findById(contentId, ['_id', 'slug', 'showSlug'], {
        cache: { enabled: true },
        lean: true,
      }),
      Errors.MOVIE.NOT_FOUND(`Maybe the media is not available`),
    );

    const { showSlug, slug } = content;

    if (showSlug && showSlug.trim().length > 0) {
      return { contentId, slug: showSlug };
    }

    return { contentId, slug };
  }
}
