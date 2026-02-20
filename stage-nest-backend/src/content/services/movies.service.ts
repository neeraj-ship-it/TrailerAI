import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { PROGRESS_THRESHOLDS } from '../constants/cta.constants';
import {
  GetMovieDetailsRequestDto,
  GetMovieWatchProgressRequestDto,
} from '../dto/movieController.request.dto';
import { GetAllMoviesResponseDto } from '../dto/movieController.response.dto';
import { ThumbnailDto } from '../dto/thumbnail.dto';
import { EpisodeType } from '../entities/episodes.entity';
import { createCtaForMovie } from '../helpers/cta.helper';
import { EpisodesRepository } from '../repositories/episode.repository';
import { PeripheralThumbnailSet } from '../schemas/peripheral.schema';
import { ContentProfileService } from './contentProfile.service';
import {
  SHARE_COPIES,
  SHARE_COPIES_PREVIEW,
} from '@app/common/constants/copies.constant';
import { PaginatedRequestDTO } from '@app/common/dtos/paginated.request.dto';
import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { Dialect, Lang, Platform } from '@app/common/enums/app.enum';
import { LanguageHelper } from '@app/common/helpers/language.helper';
import { UserRepository } from '@app/common/repositories/user.repository';
import { WatchVideoEventRepository } from '@app/common/repositories/watchVideoEvent.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ContentSensorRedisStore } from '@app/redis';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { Context, PlatformPublicContext } from 'libs/auth/src';

@Injectable()
export class MovieService {
  constructor(
    private readonly episodeRepository: EpisodesRepository,
    private readonly userRepository: UserRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly watchVideoEventRepository: WatchVideoEventRepository,
    private readonly contentSensorRedisStore: ContentSensorRedisStore,
    private contentProfileService: ContentProfileService,
  ) {}

  private async betaUserCheck(ctx: PlatformPublicContext) {
    const cohortUsers = await this.contentSensorRedisStore.getCohortUsers();
    const userId = ctx.user?.id;
    if (!userId)
      throw Errors.MOVIE.NOT_FOUND(
        'Content is not available for preview to public',
      );
    const userIndex = cohortUsers.indexOf(userId);

    if (userIndex === -1)
      throw Errors.MOVIE.NOT_FOUND(
        'Content is not available for preview to user',
      );
  }

  // for web specific requirement
  private async injectEnglishTitle(
    movieList: GetAllMoviesResponseDto[],
    slugList: string[],
    dialect: Dialect,
  ) {
    const enMovies = await this.episodeRepository.find(
      {
        displayLanguage: Lang.EN,
        language: dialect,
        slug: { $in: slugList },
        status: EpisodeStatus.ACTIVE,
        type: EpisodeType.Movie,
      },
      ['title', 'slug'],
      {
        cache: { enabled: true },
      },
    );

    enMovies?.forEach((movie) => {
      const { slug, title } = movie;
      const index = slugList.findIndex((s) => s === slug); // Find the index of the slug in slugList
      if (index !== -1) {
        movieList[index].title.en = title;
      }
    });
    return movieList;
  }

  /**
   *  This transformation is required as DB stores the peripheral thumbnail in different way,
   *  and we aim to have a unified thumbnail dto
   */
  private transformSelectedPeripheralThumbnail(
    thumbnail: PeripheralThumbnailSet,
  ): ThumbnailDto {
    const { horizontal, square, tv_image, vertical } = thumbnail;
    return {
      ...(horizontal?.sourceLink && {
        horizontal: {
          sourceLink: horizontal?.sourceLink,
        },
      }),
      ...(vertical?.sourceLink && {
        vertical: {
          sourceLink: vertical?.sourceLink,
        },
      }),
      ...(square?.sourceLink && {
        square: {
          sourceLink: square.sourceLink,
        },
      }),
      ...(tv_image?.sourceLink && {
        tv_image: {
          sourceLink: tv_image?.sourceLink,
        },
      }),
    };
  }

  async fetchMovieDetails(
    query: GetMovieDetailsRequestDto,
    ctx: PlatformPublicContext,
  ) {
    const movie = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findOne(
        {
          _id: query.movieId,
          $or: [
            {
              status: {
                $in: [EpisodeStatus.ACTIVE, EpisodeStatus.PREVIEW_PUBLISHED],
              },
            },
            {
              isComingSoon: 1,
            },
          ],
          type: EpisodeType.Movie,
        },
        [
          'isComingSoon',
          '_id',
          'title',
          'slug',
          'preContentWarningText',
          'contentWarnings',
          'isPremium',
          'genreList',
          'categoryList',
          'artistList',
          'visionularHls', // TODO: remove after sometime when old app versions totally degraded
          'selectedPeripheral',
          'videoFormatDetail',
          'thumbnail',
          'order',
          'status',
          'complianceList',
          'complianceRating',
          'duration',
          'description',
          'subtitle',
          'introEndTime',
          'introStartTime',
          'nextEpisodeNudgeStartTime',
          'displayLanguage',
          'language',
          'sourceLink',
          'freeEpisode',
          'releaseDate',
          'chatbotFab',
        ],
        {
          cache: { enabled: true },
          lean: true,
        },
      ),
      Errors.MOVIE.NOT_FOUND(
        'Maybe the media is not available or not movie type',
      ),
    );

    if (movie.status === EpisodeStatus.PREVIEW_PUBLISHED && !movie.isComingSoon)
      await this.betaUserCheck(ctx);

    const watchProgress = ctx.user?.id
      ? await this.watchVideoEventRepository.findWatchDataByEpisodeSlugsAndUserId(
          [movie.slug],
          ctx?.user?.id,
          ctx?.user?.profileId || ctx.user.id,
        )
      : null;
    let likeStatus = null;
    if (ctx?.user?.id) {
      const { status } = await this.contentProfileService.getContentLikeStatus(
        ctx?.user?.profileId || ctx.user.id,
        ctx.user.id,
        movie.slug,
      );
      likeStatus = status;
    }
    let lapsedPercent = 0;
    if (movie.duration) {
      lapsedPercent =
        watchProgress && watchProgress.length > 0
          ? Math.floor(
              (watchProgress[0].consumed_duration / movie.duration) * 100,
            )
          : 0;
    }
    const cta = await createCtaForMovie(lapsedPercent, ctx.meta.lang);

    const shareCopies =
      movie.status === EpisodeStatus.PREVIEW_PUBLISHED
        ? SHARE_COPIES_PREVIEW[ctx.meta.lang]
        : SHARE_COPIES[movie.language][ctx.meta.lang].replace(
            '#TITLE#',
            movie.title,
          );

    return {
      movie: {
        ...movie,
        chatbotFab: movie.chatbotFab ?? false,
        introEndTime: movie.introEndTime ?? null,
        introStartTime: movie.introStartTime ?? null,
        likeStatus: likeStatus,
        shareCopies,
        yearOfRelease: movie.releaseDate
          ? new Date(movie.releaseDate).getFullYear()
          : null,
        ...(movie?.selectedPeripheral && {
          selectedPeripheral: {
            ...movie.selectedPeripheral,
            ...(movie.selectedPeripheral?.thumbnail && {
              thumbnail: this.transformSelectedPeripheralThumbnail(
                movie.selectedPeripheral.thumbnail,
              ),
            }),
          },
        }),
        complianceList: movie.complianceList,
        contentDetailsCtaText: cta,
        lapsedPercent,
        restartPlayback: lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION,
        videoFormatDetails: movie.videoFormatDetail.map((v) => {
          return {
            ...v,
            // FIXME: This is a temporary fix to load the video resolution label. Need proper localisation.
            label: LanguageHelper.loadVideoResolution(ctx.meta.lang, v.bitRate),
          };
        }),
        ...(movie.nextEpisodeNudgeStartTime && {
          nextContentNudgeStartTime: movie.nextEpisodeNudgeStartTime,
        }),
      },
    };
  }

  async getAllMovies(
    query: PaginatedRequestDTO,
    ctx: Context,
  ): Promise<PaginatedResponseDTO<GetAllMoviesResponseDto>> {
    const { page = 1, perPage = 20 } = query;
    const { dialect, lang, platform } = ctx.meta;

    // TODO: have to cache this once caching implementation is done.
    const paginatedMovies = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findPaginated({
        filter: {
          displayLanguage: lang,
          language: dialect,
          status: EpisodeStatus.ACTIVE,
          type: EpisodeType.Movie,
        },
        options: {
          cache: { enabled: true },
          pagination: { page, perPage },
          sort: { createdAt: -1 },
        },
        projections: ['title', 'slug', 'thumbnail', '_id'],
      }),
      Errors.MOVIE.LIST_NOT_FOUND('Failed to fetch movie list.'),
    );

    const { pagination } = paginatedMovies;
    const slugList: string[] = [];

    const mappedMovies: GetAllMoviesResponseDto[] = paginatedMovies.data.map(
      (movie) => {
        const { _id, slug, thumbnail, title } = movie;
        slugList.push(slug);
        return {
          _id,
          slug,
          thumbnail,
          title: {
            ...(lang === Lang.HIN ? { hin: title } : { en: title }),
          },
        };
      },
    );

    const finalMoviesList =
      platform === Platform.WEB && lang === Lang.HIN
        ? await this.injectEnglishTitle(mappedMovies, slugList, dialect)
        : mappedMovies;

    return {
      data: finalMoviesList.slice(0, perPage),
      nextPageAvailable: pagination.nextPageAvailable,
      page,
      perPage,
    };
  }

  async getMoviePlatterResponse(lang: Lang, slug: string, dialect: Dialect) {
    const movie = await this.episodeRepository.findOne(
      {
        displayLanguage: lang,
        language: dialect,
        slug,
        status: EpisodeStatus.ACTIVE,
      },
      undefined,
      {
        lean: true,
      },
    );
    if (!movie) {
      return null;
    } else {
      return {
        ...movie,
        ...(movie?.selectedPeripheral && {
          selectedPeripheral: {
            ...movie.selectedPeripheral,
            ...(movie.selectedPeripheral?.thumbnail && {
              thumbnail: this.transformSelectedPeripheralThumbnail(
                movie.selectedPeripheral.thumbnail,
              ),
            }),
          },
        }),
      };
    }
  }
  // Deprecated on 04-02-2025
  async getMovieWatchProgress(
    query: GetMovieWatchProgressRequestDto,
    ctx: Context,
  ) {
    const movie = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findOne(
        { _id: query.movieId, type: EpisodeType.Movie },
        ['slug'],
        {
          cache: { enabled: true },
        },
      ),
      Errors.MOVIE.NOT_FOUND(
        'Maybe the media is not available or not movie type',
      ),
    );
    const { individualEpisodeResumedList } =
      await this.errorHandler.raiseErrorIfNullAsync(
        // TODO: We can cache this once all the cache invalidations are in place. We need to invalidate the cache when the user's continue watching list changes.
        this.userRepository.findOne(
          { _id: new Types.ObjectId(ctx.user.id) },
          ['individualEpisodeResumedList'],
          {
            lean: true,
          },
        ),
        Errors.USER.USER_NOT_FOUND(),
      );

    const movieWatchProgress =
      individualEpisodeResumedList && individualEpisodeResumedList[movie.slug];

    return {
      watchProgress: movieWatchProgress
        ? {
            watchProgressPercentage: movieWatchProgress,
          }
        : null,
    };
  }
}
