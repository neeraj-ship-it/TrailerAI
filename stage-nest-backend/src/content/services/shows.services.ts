import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { EpisodeDto } from '../dto/episode.dto';

import {
  DATE_OVERLAY_CONSTANTS,
  TV_APP_BUILD_CONSTANTS,
} from '../constants/content.constants';
import { PROGRESS_THRESHOLDS } from '../constants/cta.constants';
import {
  MicroDramaAction,
  ToggleMicroDramaLikeRequestDto,
  ToggleMicroDramaLikeResponseDto,
} from '../dto/microDrama.dto';
import { ShowDetailsBySlugDto, ShowDto } from '../dto/show.dto';
import { TeaserDto } from '../dto/teaser.dto';
import { SeasonStatus } from '../entities/season.entity';
import { createCtaForShow } from '../helpers/cta.helper';
import { ISeason, MediaItemDto } from '../interfaces/content.interface';
import { EpisodesRepository } from '../repositories/episode.repository';
import { MicroDramaInteractionRepository } from '../repositories/microDramaInteraction.repository';
import { ContentProfileService } from './contentProfile.service';
import {
  SHARE_COPIES,
  SHARE_COPIES_PREVIEW,
} from '@app/common/constants/copies.constant';
import { ShowStatus } from '@app/common/entities/show-v2.entity';
import { WatchVideoEvent } from '@app/common/entities/watchVideoEvent.entity';
import { Dialect, Lang, Platform } from '@app/common/enums/app.enum';
import { LanguageHelper } from '@app/common/helpers/language.helper';
import { WatchVideoEventRepository } from '@app/common/repositories/watchVideoEvent.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ContentSensorRedisStore } from '@app/redis';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { PeripheralMediaType, VideoResolution } from 'common/enums/media.enum';
import {
  formatDateOverlayText,
  getDateIST,
} from 'common/helpers/dateTime.helper';
import { PlatformPublicContext } from 'libs/auth/src';
import { ShowRepository } from 'src/content/repositories/show.repository';
import { UserProfileService } from 'src/users/services/userProfile.service';

interface GetShowDetails {
  ctx: PlatformPublicContext;
  endEpisodeNumber?: number;
  seasonId?: number;
  showId: number;
  startEpisodeNumber?: number;
}

@Injectable()
export class ShowsService {
  constructor(
    @Inject() private showRepository: ShowRepository,
    @Inject() private episodeRepository: EpisodesRepository,
    @Inject() private errorHandler: ErrorHandlerService,
    @Inject() private watchVideoEventRepository: WatchVideoEventRepository,
    @Inject()
    private microDramaInteractionRepository: MicroDramaInteractionRepository,
    @Inject() private contentSensorRedisStore: ContentSensorRedisStore,
    @Inject(forwardRef(() => ContentProfileService))
    private contentProfileService: ContentProfileService,
    @Inject(forwardRef(() => UserProfileService))
    private userProfileService: UserProfileService,
  ) {}

  private getTeaserFromMediaList(
    mediaList?: MediaItemDto[],
  ): TeaserDto | undefined {
    if (!mediaList) {
      return undefined;
    }

    const teaserMediaItem = mediaList.find(
      (mediaItem) =>
        mediaItem.mediaType === PeripheralMediaType.TEASER &&
        mediaItem.hlsSourceLink,
    );

    if (!teaserMediaItem) {
      return undefined;
    }

    return {
      duration: teaserMediaItem.duration,
      hls265SourceLink: teaserMediaItem.visionularHlsH265?.hlsSourcelink || '',
      hlsSourceLink: teaserMediaItem.hlsSourceLink || '',
      sourceLink: teaserMediaItem.sourceLink,
    };
  }

  private shouldShowComingSoonEpisodes(
    platform: Platform,
    appBuildNumber?: number,
  ): boolean {
    // For TV platform, only show coming soon episodes if build number meets minimum requirement
    if (platform === Platform.TV) {
      return (
        appBuildNumber !== undefined &&
        appBuildNumber >=
          TV_APP_BUILD_CONSTANTS.TV_EPISODIC_RELEASE_MIN_BUILD_NUMBER
      );
    }
    // All other platforms (App, Web) show coming soon episodes
    return true;
  }

  addDateOverlayToEpisodes(
    status: EpisodeStatus,
    comingSoonDate: Date | null | undefined,
    targetStatus: EpisodeStatus,
    language: Lang = Lang.EN,
  ): string | null {
    // Only return dateOverlayText if status matches target and date exists
    if (status !== targetStatus || !comingSoonDate) {
      return null;
    }

    // Convert to IST and format the date
    const istDate = getDateIST(new Date(comingSoonDate));
    const locale = DATE_OVERLAY_CONSTANTS.LOCALE_MAP[language];
    const availableText = DATE_OVERLAY_CONSTANTS.AVAILABLE_TEXT[language];

    return formatDateOverlayText(istDate, locale, availableText);
  }

  async betaUserCheck(ctx: PlatformPublicContext) {
    const cohortUsers = await this.contentSensorRedisStore.getCohortUsers();
    const userId = ctx.user?.id;
    if (!userId)
      throw Errors.SHOW.NOT_FOUND(
        'Content is not available for preview to public',
      );
    const userIndex = cohortUsers.indexOf(userId);

    if (userIndex === -1)
      throw Errors.SHOW.NOT_FOUND(
        'Content is not available for preview to user',
      );
  }

  async fetchMovieDetails(ctx: PlatformPublicContext, movieId: number) {
    const movie = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findActiveShowById(
        {
          showId: movieId,
        },
        [
          '_id',
          'title',
          'thumbnail',
          'language',
          'displayLanguage',
          'description',
          'selectedPeripheral',
          'slug',
          'isPremium',
          'isComingSoon',
          'status',
        ],
      ),
      Errors.SHOW.NOT_FOUND(),
    );

    if (movie.isComingSoon === true) {
      movie.status = ShowStatus.COMING_SOON;
    }

    if (movie.status === ShowStatus.PREVIEW_PUBLISH)
      await this.betaUserCheck(ctx);

    // Get like status if user is authenticated
    let likeStatus = null;
    if (ctx?.user?.id) {
      const { status } = await this.contentProfileService.getContentLikeStatus(
        ctx?.user?.profileId || ctx.user.id,
        ctx.user.id,
        movie.slug,
      );
      likeStatus = status;
    }

    const shareCopies =
      movie.status === ShowStatus.PREVIEW_PUBLISH
        ? SHARE_COPIES_PREVIEW[ctx.meta.lang]
        : SHARE_COPIES[movie.language][ctx.meta.lang].replace(
            '#TITLE#',
            movie.title,
          );
    return {
      data: {
        description: movie.description,
        displayLanguage: movie.displayLanguage,
        id: movie._id,
        isPremium: movie.isPremium,
        language: movie.language,
        likeStatus,
        selectedPeripheral: movie.selectedPeripheral,
        shareCopies,
        slug: movie.slug,
        status:
          movie.isComingSoon === true ? ShowStatus.COMING_SOON : movie.status,
        thumbnail: movie.thumbnail,
        title: movie.title,
        yearOfRelease: movie.releaseDate
          ? new Date(movie.releaseDate).getFullYear()
          : null,
      },
    };
  }

  async getShowDetails({ ctx, showId }: GetShowDetails) {
    const show = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findActiveShowById(
        {
          showId,
        },
        [
          '_id',
          'title',
          'thumbnail',
          'language',
          'displayLanguage',
          'description',
          'selectedPeripheral',
          'slug',
          'isPremium',
          'chatbotFab',
        ],
      ),
      Errors.SHOW.NOT_FOUND(),
    );
    const episodes = await this.errorHandler.raiseErrorIfNullAsync(
      this.episodeRepository.findActiveEpisodesByShowId(showId, [
        'showId',
        'thumbnail',
        'order',
        'title',
        'isPremium',
        'genreList',
        'language',
        'displayLanguage',
        'subtitle',
        'introEndTime',
        'introStartTime',
        'nextEpisodeNudgeStartTime',
        'slug',
        'duration',
        'episodeOrder',
        'videoFormatDetail',
        'description',
        'type',
        'freeEpisode',
      ]),
      Errors.EPISODE.NOT_FOUND(),
    );

    if (show.status === ShowStatus.PREVIEW_PUBLISH)
      await this.betaUserCheck(ctx);

    // TODO: refactor after mongoose population type fix
    const episodeList: EpisodeDto[] = episodes.map((episode) => {
      return {
        ...episode,
        introEndTime: episode.introEndTime ?? null,
        introStartTime: episode.introStartTime ?? null,
        videoFormatDetails: episode.videoFormatDetail.map((v) => {
          return {
            ...v,
            // FIXME: This is a temporary fix to load the video resolution label. Need proper localisation.
            label: LanguageHelper.loadVideoResolution(ctx.meta.lang, v.bitRate),
            size: v.size ?? 0,
          };
        }),
      };
    });

    const showDto: ShowDto = {
      ...show,
      chatbotFab: show.chatbotFab ?? false,
    };
    return {
      episodes: episodeList,
      show: showDto,
    };
  }
  async getShowDetailsByPlatform({
    ctx,
    endEpisodeNumber,
    seasonId,
    showId,
    startEpisodeNumber,
  }: GetShowDetails) {
    if (ctx.meta.platform === Platform.WEB) {
      return this.getShowDetailsWithProgressForWeb({
        ctx,
        endEpisodeNumber,
        seasonId,
        showId,
        startEpisodeNumber,
      });
    } else {
      return this.getShowDetailsWithProgressForApp({
        ctx,
        endEpisodeNumber,
        seasonId,
        showId,
        startEpisodeNumber,
      });
    }
  }

  async getShowDetailsBySlug(
    slug: string,
    lang: Lang,
  ): Promise<ShowDetailsBySlugDto> {
    return await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findOne(
        { displayLanguage: lang, slug },
        ['_id', 'title', 'thumbnail'],
        {
          cache: { enabled: true },
          lean: true,
        },
      ),
      Errors.SHOW.NOT_FOUND(),
    );
  }

  async getShowDetailsWithProgressForApp({
    ctx,
    endEpisodeNumber = 30,
    seasonId,
    showId,
    startEpisodeNumber = 0,
  }: GetShowDetails & {
    startEpisodeNumber?: number;
    endEpisodeNumber?: number;
  }) {
    if (startEpisodeNumber < 0) startEpisodeNumber = 0;
    if (endEpisodeNumber < 0 || endEpisodeNumber > 30) endEpisodeNumber = 30;

    const isSecondShow = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.find(
        {
          _id: showId,
        },
        ['_id', 'referenceShowIds', 'status'],
      ),
      Errors.SHOW.NOT_FOUND(),
    );
    if (isSecondShow[0].referenceShowIds.length > 0) {
      showId = isSecondShow[0].referenceShowIds[0];
    }
    let watchData: WatchVideoEvent[] = [];
    const episodeSlugs: string[] = [];

    const shows = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.getShowWithSeasonAndEpisode(showId, seasonId ?? 0),
      Errors.SHOW.NOT_FOUND(),
    );
    const show = shows[0];

    if (show.isComingSoon === true) {
      show.status = ShowStatus.COMING_SOON;
    }
    show?.seasons.forEach((season) => {
      if (season.isComingSoon === true) {
        season.status = SeasonStatus.COMING_SOON;
      }
    });

    const latestSeasonReleaseDate = show.latestSeasonReleaseDate;
    const currentTime = new Date().getTime();
    const latestReleaseTime = new Date(latestSeasonReleaseDate).getTime();
    const timeDifference = currentTime - latestReleaseTime;
    const ninetyDaysInMilliseconds = 90 * 24 * 60 * 60 * 1000;

    const isLatestSeasonNew = timeDifference < ninetyDaysInMilliseconds;
    show?.seasons.forEach((season, seasonIndex) => {
      if (seasonIndex === show.seasons.length - 1 && isLatestSeasonNew) {
        season.isNew = true;
      } else {
        season.isNew = false;
      }

      // Filter episodes based on platform and build number
      const filteredEpisodes = season.episodes.filter((episode) => {
        if (episode.status === EpisodeStatus.COMING_SOON) {
          return this.shouldShowComingSoonEpisodes(
            ctx.meta.platform,
            ctx.meta.appBuildNumber,
          );
        }
        return true;
      });

      // Update the season with filtered episodes
      show.seasons[seasonIndex].episodes = filteredEpisodes;

      if (seasonId) {
        if (season._id === seasonId) {
          filteredEpisodes.forEach((episode, episodeIndex) => {
            episodeSlugs.push(`${episode.slug}`);
            show.seasons[seasonIndex].episodes[episodeIndex].id = episode._id;
          });
        }
      } else {
        filteredEpisodes.forEach((episode, episodeIndex) => {
          episodeSlugs.push(`${episode.slug}`);
          show.seasons[seasonIndex].episodes[episodeIndex].id = episode._id;
        });
      }
    });
    if (ctx?.user?.id) {
      watchData =
        await this.watchVideoEventRepository.findWatchDataByEpisodeSlugsAndUserId(
          episodeSlugs,
          ctx.user.id,
          ctx?.user?.profileId || ctx.user.id,
        );
    }
    let lastWatchedSeason: ISeason = show.seasons[0];
    let currentSeason: ISeason;

    if (watchData.length > 0) {
      lastWatchedSeason =
        show.seasons.find((season) =>
          season.episodes.some(
            (episode) => episode.slug === watchData?.[0]?.content_slug,
          ),
        ) ?? show.seasons[0];
    }
    if (seasonId) {
      currentSeason =
        show.seasons.find((season) => season._id === seasonId) ??
        show.seasons[0];
    } else {
      currentSeason = lastWatchedSeason ?? show.seasons[0];
    }

    const likedEpisodesMap = new Map<string, boolean>();
    if (ctx?.user?.id) {
      const likedInteractions = await this.microDramaInteractionRepository.find(
        {
          profileId: ctx?.user?.profileId || ctx.user.id,
          showSlug: show.slug,
          userId: ctx.user.id,
        },
      );

      likedInteractions.forEach((interaction) => {
        if (interaction.likedContent) {
          interaction.likedContent.forEach((episodeSlug) => {
            likedEpisodesMap.set(episodeSlug, true);
          });
        }
      });
    }

    const allCurrentSeasonEpisodes = await Promise.all(
      currentSeason.episodes.map(async (episode) => {
        const watched = watchData?.find(
          (watch) => watch?.content_slug === episode.slug,
        );
        let lapsedPercent = 0;
        if (episode.duration)
          lapsedPercent = watched
            ? Math.floor((watched.consumed_duration / episode.duration) * 100)
            : 0;

        // Check if episode is liked using the pre-fetched map
        const isLiked = likedEpisodesMap.get(episode.slug) || false;

        // Generate date overlay text for coming soon episodes
        const dateOverlayText = this.addDateOverlayToEpisodes(
          episode.status,
          episode.comingSoonDate,
          EpisodeStatus.COMING_SOON,
          ctx.meta.lang,
        );

        const teaser =
          episode.status === EpisodeStatus.COMING_SOON
            ? this.getTeaserFromMediaList(episode.mediaList)
            : undefined;

        return {
          ...episode,
          comingSoonDate: episode.comingSoonDate
            ? new Date(episode.comingSoonDate)
            : undefined,
          dateOverlayText,
          isLiked: isLiked,
          lapsedPercent,
          progress: watched ? watched.consumed_duration : 0,
          restartPlayback: lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION,
          status: show.isComingSoon
            ? EpisodeStatus.COMING_SOON
            : episode.status,
          ...(teaser && { teaser }),
          mediaList: undefined,
          videoFormatDetail:
            (episode.videoFormatDetail && episode.videoFormatDetail.length > 0
              ? [...episode.videoFormatDetail]
              : Object.values(VideoResolution).reduce<
                  { bitRate: number; label: string; size: number }[]
                >((acc, res) => {
                  if (typeof res === 'number') {
                    acc.push({
                      bitRate: res,
                      label: `${res}px`,
                      size: 0,
                    });
                  }
                  return acc;
                }, [])
            )?.sort((a, b) => a.bitRate - b.bitRate) ?? [],
        };
      }),
    );

    // Apply pagination
    const endIndex = startEpisodeNumber + endEpisodeNumber;
    const paginatedEpisodes =
      show.format === ContentFormat.MICRO_DRAMA
        ? allCurrentSeasonEpisodes.slice(startEpisodeNumber, endIndex)
        : allCurrentSeasonEpisodes;
    const totalEpisodes = allCurrentSeasonEpisodes.length;

    const dialect = show.language;
    const title = show.title;

    // Get like status if user is authenticated
    let likeStatus = null;
    if (ctx?.user?.id) {
      const { status } = await this.contentProfileService.getContentLikeStatus(
        ctx?.user?.profileId || ctx.user.id,
        ctx.user.id,
        show.slug,
      );
      likeStatus = status;
    }

    const pages = [];
    for (let i = 1; i <= Math.ceil(totalEpisodes / endEpisodeNumber); i++) {
      const pageStartIndex = (i - 1) * endEpisodeNumber;
      const pageEndIndex = Math.min(i * endEpisodeNumber, totalEpisodes);

      pages.push({
        pageEndIndex: pageEndIndex,
        pageNumber: i,
        pageStartIndex: pageStartIndex + 1,
        pageUrl: `/shows/details?showId=${showId}&startEpisodeNumber=${pageStartIndex}&endEpisodeNumber=${endEpisodeNumber}`,
      });
    }
    const lastSeenDetail = {
      episodeId:
        allCurrentSeasonEpisodes.find(
          (episode) => episode.slug === watchData?.[0]?.content_slug,
        )?.id || null,
      episodeSlug:
        allCurrentSeasonEpisodes.find(
          (episode) => episode.slug === watchData?.[0]?.content_slug,
        )?.slug || null,
      seasonId: currentSeason._id,
      seasonSlug: currentSeason.slug,
      showSlug: show.slug,
    };
    const seasonList = shows[0].seasons.map((season, index: number) => {
      const activeEpisodeCount = season.episodes.filter(
        (episode) => episode.status === EpisodeStatus.ACTIVE,
      ).length;
      return {
        episodeCount: activeEpisodeCount,
        id: season._id,
        isNew: season.isNew,
        seasonOrder: index + 1,
        slug: season.slug,
        status:
          season.isComingSoon === true
            ? SeasonStatus.COMING_SOON
            : season.status,
      };
    });

    const cta = await createCtaForShow(
      lastSeenDetail.episodeSlug,
      lastSeenDetail.seasonSlug,
      paginatedEpisodes,
      seasonList,
      ctx.meta.lang,
    );

    const shareCopies =
      show.status === ShowStatus.PREVIEW_PUBLISH
        ? SHARE_COPIES_PREVIEW[ctx.meta.lang]
        : SHARE_COPIES[dialect][ctx.meta.lang].replace('#TITLE#', title);
    return {
      data: {
        // artistList: show.artistList,
        complianceList: show.complianceList,
        contentDetailsCtaText: cta,
        description: show.description,
        displayLanguage: show.displayLanguage,
        episodes: paginatedEpisodes,
        format: show.format || ContentFormat.STANDARD,
        id: show._id,
        isPremium: show.isPremium,
        language: show.language,
        lastSeenDetail: lastSeenDetail,
        likeStatus: likeStatus,
        pagination: {
          currentPage: Math.floor(startEpisodeNumber / endEpisodeNumber) + 1,
          pages: pages,
        },
        seasonDuration: allCurrentSeasonEpisodes.reduce(
          (acc: number, episode) => acc + episode.duration,
          0,
        ),
        seasonId: currentSeason._id,
        seasonSlug: currentSeason.slug,
        selectedPeripheral: show.selectedPeripheral,
        shareCopies,
        slug: show.slug,
        status:
          show.isComingSoon === true ? ShowStatus.COMING_SOON : show.status,
        thumbnail: show.thumbnail,
        title: show.title,
        totalEpisodes: totalEpisodes,
        totalSeasons: shows[0].seasons.length,
        upcomingScheduleText: show.upcomingScheduleText,
        yearOfRelease: show.releaseDate
          ? new Date(show.releaseDate).getFullYear()
          : null,
      },
      seasonList: shows[0].seasons.map((season, index: number) => {
        return {
          episodeCount: season.episodes.length,
          id: season._id,
          isNew: season.isNew,
          seasonOrder: index + 1,
          status:
            season.isComingSoon === true
              ? SeasonStatus.COMING_SOON
              : season.status,
        };
      }),
    };
  }

  async getShowDetailsWithProgressForWeb({
    ctx,
    endEpisodeNumber = 30,
    seasonId,
    showId,
    startEpisodeNumber = 0,
  }: GetShowDetails & {
    startEpisodeNumber?: number;
    endEpisodeNumber?: number;
  }) {
    if (startEpisodeNumber < 0) startEpisodeNumber = 0;
    if (endEpisodeNumber < 0 || endEpisodeNumber > 30) endEpisodeNumber = 30;
    const isSecondShow = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.find(
        {
          _id: showId,
        },
        ['_id', 'referenceShowIds', 'status'],
      ),
      Errors.SHOW.NOT_FOUND(),
    );
    if (isSecondShow[0].referenceShowIds.length > 0) {
      showId = isSecondShow[0].referenceShowIds[0];
    }
    let watchData: WatchVideoEvent[] = [];
    const episodeSlugs: string[] = [];

    const shows = await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.getShowWithSeasonAndEpisode(showId, seasonId ?? 0),
      Errors.SHOW.NOT_FOUND(),
    );
    const show = shows[0];

    if (show.isComingSoon === true) {
      show.status = ShowStatus.COMING_SOON;
    }
    show?.seasons.forEach((season) => {
      if (season.isComingSoon === true) {
        season.status = SeasonStatus.COMING_SOON;
      }
    });

    const latestSeasonReleaseDate = show.latestSeasonReleaseDate;
    const currentTime = new Date().getTime();
    const latestReleaseTime = new Date(latestSeasonReleaseDate).getTime();
    const timeDifference = currentTime - latestReleaseTime;
    const ninetyDaysInMilliseconds = 90 * 24 * 60 * 60 * 1000;
    const isSlugInWatchlist = await this.userProfileService.isSlugInWatchlist(
      ctx.user?.id,
      ctx?.user?.profileId || ctx.user?.id,
      show.slug,
    );
    const isLatestSeasonNew = timeDifference < ninetyDaysInMilliseconds;
    show?.seasons.forEach((season, seasonIndex) => {
      if (seasonIndex === show.seasons.length - 1 && isLatestSeasonNew) {
        season.isNew = true;
      } else {
        season.isNew = false;
      }

      // Filter episodes based on platform and build number
      const filteredEpisodes = season.episodes.filter((episode) => {
        if (episode.status === EpisodeStatus.COMING_SOON) {
          return this.shouldShowComingSoonEpisodes(
            ctx.meta.platform,
            ctx.meta.appBuildNumber,
          );
        }
        return true;
      });

      // Update the season with filtered episodes
      show.seasons[seasonIndex].episodes = filteredEpisodes;

      filteredEpisodes.forEach((episode, episodeIndex) => {
        episodeSlugs.push(`${episode.slug}`);
        show.seasons[seasonIndex].episodes[episodeIndex].id = episode._id;
      });
    });
    if (ctx?.user?.id) {
      watchData =
        await this.watchVideoEventRepository.findWatchDataByEpisodeSlugsAndUserId(
          episodeSlugs,
          ctx.user.id,
          ctx?.user?.profileId || ctx.user.id,
        );
    }
    let lastSeasonSeasonDetails: ISeason | undefined;
    if (watchData.length > 0) {
      lastSeasonSeasonDetails = show.seasons.find((season) =>
        season.episodes.some(
          (episode) => episode.slug === watchData?.[0]?.content_slug,
        ),
      );
    }
    const isCurrentSeason = show.seasons.find(
      (season) => season._id === seasonId,
    );
    const currentSeason: ISeason = isCurrentSeason
      ? isCurrentSeason
      : show.seasons[0];

    const likedEpisodesMap = new Map<string, boolean>();
    if (ctx?.user?.id) {
      const likedInteractions = await this.microDramaInteractionRepository.find(
        {
          profileId: ctx?.user?.profileId || ctx.user.id,
          showSlug: show.slug,
          userId: ctx.user.id,
        },
      );

      likedInteractions.forEach((interaction) => {
        if (interaction.likedContent) {
          interaction.likedContent.forEach((episodeSlug) => {
            likedEpisodesMap.set(episodeSlug, true);
          });
        }
      });
    }

    const allCurrentSeasonEpisodes = currentSeason.episodes.map((episode) => {
      const watched = watchData?.find(
        (watch) => watch?.content_slug === episode.slug,
      );
      let lapsedPercent = 0;
      if (episode.duration)
        lapsedPercent = watched
          ? Math.floor((watched.consumed_duration / episode.duration) * 100)
          : 0;

      // Check if episode is liked using the pre-fetched map
      const isLiked = likedEpisodesMap.get(episode.slug) || false;

      // Generate date overlay text for coming soon episodes
      const dateOverlayText = this.addDateOverlayToEpisodes(
        episode.status,
        episode.comingSoonDate,
        EpisodeStatus.COMING_SOON,
        ctx.meta.lang,
      );

      const teaser =
        episode.status === EpisodeStatus.COMING_SOON
          ? this.getTeaserFromMediaList(episode.mediaList)
          : undefined;

      return {
        ...episode,
        comingSoonDate: episode.comingSoonDate
          ? new Date(episode.comingSoonDate)
          : undefined,
        dateOverlayText,
        isLiked: isLiked,
        lapsedPercent,
        progress: watched ? watched.consumed_duration : 0,
        restartPlayback: lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION,
        ...(teaser && { teaser }),
        mediaList: undefined,
        status: show.isComingSoon ? EpisodeStatus.COMING_SOON : episode.status,
        videoFormatDetail:
          (episode.videoFormatDetail && episode.videoFormatDetail.length > 0
            ? [...episode.videoFormatDetail]
            : Object.values(VideoResolution).reduce<
                { bitRate: number; label: string; size: number }[]
              >((acc, res) => {
                if (typeof res === 'number') {
                  acc.push({
                    bitRate: res,
                    label: `${res}px`,
                    size: 0,
                  });
                }
                return acc;
              }, [])
          )?.sort((a, b) => a.bitRate - b.bitRate) ?? [],
      };
    });

    // Apply pagination
    const endIndex = startEpisodeNumber + endEpisodeNumber;
    const paginatedEpisodes =
      show.format === ContentFormat.MICRO_DRAMA
        ? allCurrentSeasonEpisodes.slice(startEpisodeNumber, endIndex)
        : allCurrentSeasonEpisodes;
    const totalEpisodes = allCurrentSeasonEpisodes.length;

    const dialect = show.language;
    const title = show.title;

    // Get like status if user is authenticated
    let likeStatus = null;
    if (ctx?.user?.id) {
      const { status } = await this.contentProfileService.getContentLikeStatus(
        ctx?.user?.profileId || ctx.user.id,
        ctx.user.id, //Todo: profile is not implemented in web so we are using userId, need to update this when profile is implemented in web
        show.slug,
      );
      likeStatus = status;
    }

    const pages = [];
    for (let i = 1; i <= Math.ceil(totalEpisodes / endEpisodeNumber); i++) {
      const pageStartIndex = (i - 1) * endEpisodeNumber;
      const pageEndIndex = Math.min(i * endEpisodeNumber, totalEpisodes);

      pages.push({
        pageEndIndex: pageEndIndex,
        pageNumber: i,
        pageStartIndex: pageStartIndex + 1,
        pageUrl: `/shows/details?showId=${showId}&startEpisodeNumber=${pageStartIndex}&endEpisodeNumber=${endEpisodeNumber}`,
      });
    }

    const lastSeenDetail = {
      episodeId:
        allCurrentSeasonEpisodes.find(
          (episode) => episode.slug === watchData?.[0]?.content_slug,
        )?.id || null,
      episodeSlug:
        allCurrentSeasonEpisodes.find(
          (episode) => episode.slug === watchData?.[0]?.content_slug,
        )?.slug || null,
      seasonId: lastSeasonSeasonDetails?._id ?? currentSeason._id,
      seasonSlug: lastSeasonSeasonDetails?.slug ?? currentSeason.slug,
      showSlug: show.slug,
    };
    const seasonList = shows[0].seasons.map((season, index: number) => {
      const activeEpisodeCount = season.episodes.filter(
        (episode) => episode.status === EpisodeStatus.ACTIVE,
      ).length;
      return {
        episodeCount: activeEpisodeCount,
        id: season._id,
        isNew: season.isNew,
        seasonOrder: index + 1,
        slug: season.slug,
        status:
          season.isComingSoon === true
            ? SeasonStatus.COMING_SOON
            : season.status,
      };
    });
    const cta = await createCtaForShow(
      lastSeenDetail.episodeSlug,
      lastSeenDetail.seasonSlug,
      paginatedEpisodes,
      seasonList,
      ctx.meta.lang,
    );
    const shareCopies =
      show.status === ShowStatus.PREVIEW_PUBLISH
        ? SHARE_COPIES_PREVIEW[ctx.meta.lang]
        : SHARE_COPIES[dialect][ctx.meta.lang].replace('#TITLE#', title);

    return {
      data: {
        artistList: show.artistList,
        complianceList: show.complianceList,
        contentDetailsCtaText: cta,
        description: show.description,
        displayLanguage: show.displayLanguage,
        episodes: paginatedEpisodes,
        format: show.format,
        id: show._id,
        isPremium: show.isPremium,
        isWatchlistedContent: isSlugInWatchlist,
        language: show.language,
        lastSeenDetail: lastSeenDetail,
        likeStatus,
        pagination: {
          currentPage: Math.floor(startEpisodeNumber / endEpisodeNumber) + 1,
          pages: pages,
        },
        seasonDuration: currentSeason.episodes.reduce(
          (acc: number, episode) => acc + episode.duration,
          0,
        ),
        seasonId: currentSeason._id,
        seasonSlug: currentSeason.slug,
        selectedPeripheral: show.selectedPeripheral,
        shareCopies,
        slug: show.slug,
        status:
          show.isComingSoon === true ? ShowStatus.COMING_SOON : show.status,
        thumbnail: show.thumbnail,
        title: show.title,
        totalEpisodes: totalEpisodes,
        totalSeasons: shows[0].seasons.length,
        upcomingScheduleText: show.upcomingScheduleText,
        yearOfRelease: show.releaseDate
          ? new Date(show.releaseDate).getFullYear()
          : null,
      },
      seasonList: seasonList,
    };
  }

  async getShowPlatterResponse(lang: Lang, slug: string, dialect: Dialect) {
    const show = await this.showRepository.findOne(
      {
        displayLanguage: lang,
        language: dialect,
        slug,
        status: ShowStatus.ACTIVE,
      },
      undefined,
      { lean: true },
    );

    if (!show) {
      return null;
    } else {
      const episodeDetails = await this.episodeRepository.findOne(
        {
          displayLanguage: show.displayLanguage,
          language: show.language,
          showId: show['_id'],
          status: ShowStatus.ACTIVE,
        },
        ['_id', 'slug', 'seasonId', 'seasonSlug'],
        {
          cache: { enabled: true },
          lean: true,
          limit: 1,
          sort: { order: 1 },
        },
      );
      return {
        ...show,
        contentType: 'show',
        firstEpisodeId: episodeDetails?._id,
        firstEpisodeSlug: episodeDetails?.slug,
        firstSeasonId: episodeDetails?.seasonId,
        firstSeasonSlug: episodeDetails?.seasonSlug,
        type: 'show',
      };
    }
  }

  async getShowSlugByContentId(content_id: number): Promise<{ slug: string }> {
    return await this.errorHandler.raiseErrorIfNullAsync(
      this.showRepository.findOne({ _id: content_id }, ['slug'], {
        cache: { enabled: true },
        lean: true,
      }),
      Errors.SHOW.NOT_FOUND(),
    );
  }

  async isEpisodeLikedByUser(
    userId: string,
    profileId: string,
    episodeSlug: string,
    showSlug: string,
  ): Promise<boolean> {
    const interaction = await this.microDramaInteractionRepository.findOne({
      likedContent: { $in: [episodeSlug] },
      profileId,
      showSlug,
      userId,
    });

    return interaction ? true : false;
  }

  async toggleMicroDramaLike(
    userId: string,
    profileId: string,
    toggleMicroDramaLikeRequest: ToggleMicroDramaLikeRequestDto,
  ): Promise<ToggleMicroDramaLikeResponseDto> {
    const { action, episodeSlug, showSlug } = toggleMicroDramaLikeRequest;

    if (action !== MicroDramaAction.LIKE) return { success: false };

    await this.userProfileService.getProfileById(profileId, userId);
    // Find existing interaction for this user and show
    let interaction = await this.microDramaInteractionRepository.findOne({
      profileId: profileId,
      showSlug,
      userId: userId,
    });

    // Create new interaction if none exists
    if (!interaction) {
      interaction = this.microDramaInteractionRepository.create({
        likedContent: [episodeSlug],
        profileId: profileId,
        showSlug,
        userId: userId,
      });
    } else {
      // Toggle episode in likedContent array
      const likedContentIndex = interaction.likedContent.indexOf(episodeSlug);
      if (likedContentIndex === -1) {
        interaction.likedContent.push(episodeSlug);
      } else {
        interaction.likedContent.splice(likedContentIndex, 1);
      }
    }

    // Save changes
    await this.microDramaInteractionRepository
      .getEntityManager()
      .persistAndFlush(interaction);
    return { success: true };
  }
}
