import { ObjectId } from '@mikro-orm/mongodb';
import { Injectable, Logger } from '@nestjs/common';

import {
  ReelResponseDto,
  ReelsResponse,
  RegisterActionReelsRequestDto,
  WatchProgressReelsRequestDto,
} from '../dto/reels.dto';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ReelActionRepository } from '../repositories/reelAction.repository';
import { ShowRepository } from '../repositories/show.repository';
import { ReelsRecommendationService } from './reel-recommendation.service';
import { Meta } from '@app/auth';
import { ReelRepository } from '@app/cms/repositories/reel.repository';
import {
  ReelEntity,
  ReelStatusEnum,
  ReelType,
} from '@app/common/entities/reel.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import { Events } from '@app/events/interfaces/events.interface';
import { ComplexRedisService } from '@app/redis/stores/complex-redis.service';
import { S3Service } from '@app/storage';
import { APP_CONFIGS } from 'common/configs/app.config';
import { ContentType } from 'common/enums/common.enums';
import { WatchVideoEventRepository } from 'common/repositories/watchVideoEvent.repository';

export const suggestionTitle = {
  en: `Based on your interest in `,
  hin: 'आपकी रुचि के आधार पर ',
};

export enum ReelInteractionType {
  LIKE = 'like',
  SHARE = 'share',
  VIEW = 'view',
}
export enum EngagementWeightsEnum {
  serendipity = 'serendipity',
  similarity = 'similarity',
  statistical = 'statistical',
}

export type EngagementLevel = 'HIGH' | 'MEDIUM' | 'BASELINE' | 'LOW' | 'NIL';

export interface EngagementWeights {
  serendipity: number;
  similarity: number;
  statistical: number;
}

// Weights based on engagement level (from your table)
export const ENGAGEMENT_WEIGHTS: Record<EngagementLevel, EngagementWeights> = {
  BASELINE: { serendipity: 10, similarity: 30, statistical: 60 },
  HIGH: { serendipity: 0, similarity: 40, statistical: 60 },
  LOW: { serendipity: 40, similarity: 20, statistical: 40 },
  MEDIUM: { serendipity: 20, similarity: 30, statistical: 50 },
  NIL: { serendipity: 80, similarity: 0, statistical: 20 },
};

interface GetAllReelsParams {
  dialect: Dialect;
  lang: Lang;
  lastReelId?: string;
  limit?: number;
  userId: string;
}

@Injectable()
export class ReelsService {
  private readonly DEFAULT_BATCH_SIZE = 7;
  private readonly logger = new Logger(ReelsService.name);

  constructor(
    private readonly reelRepository: ReelRepository,
    private readonly s3Service: S3Service,
    private readonly showRepository: ShowRepository,
    private readonly episodesRepository: EpisodesRepository,
    private readonly reelActionRepository: ReelActionRepository,
    private readonly eventsService: EventService,
    private readonly redisService: ComplexRedisService,
    private readonly reelsRecommendationService: ReelsRecommendationService,
    private readonly watchVideoEventRepository: WatchVideoEventRepository,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async addReelToRedis(id: string, dialect: Dialect, lang: Lang) {
    const key = `${dialect}:reels:${id}:${lang}`;
    const reel = await this.reelRepository.findOne({
      _id: new ObjectId(id),
    });
    if (!reel) {
      return;
    }

    if (reel.status === ReelStatusEnum.PUBLISHED) {
      const reelResponse = await this.getReelInResponseFormat(
        reel,
        dialect,
        lang,
      );
      if (reelResponse) {
        await this.redisService.jsonSet(key, reelResponse);

        const pipeline = await this.redisService.getPipeline();
        const isReelInRecommendation = await this.redisService.zscore(
          `${dialect}:statistical`,
          reelResponse._id,
        );
        if (!isReelInRecommendation) {
          const lastReels = await this.redisService.zrevrange(
            `${dialect}:statistical`,
            -1,
            0,
            true,
          );
          pipeline.zadd(
            `${dialect}:statistical`,
            parseInt(lastReels.pop() || '0') + 1,
            reelResponse._id,
          );
        }
        pipeline.sadd(
          `${dialect}:content:${reel.contentType}_${reel.contentSlug}:reels`,
          reelResponse._id,
        );
        // TODO: add to genre:reels:genreID set here
        reelResponse.contentGenreList.forEach((genre) => {
          pipeline.sadd(`${dialect}:genre:${genre}:reels`, reelResponse._id);
        });
        const breakpoint = await this.getBreakPointReels(
          reel.contentSlug,
          reel.contentType,
          lang,
        );
        if (breakpoint) {
          this.redisService.jsonSet(
            `${dialect}:breakpoint:${breakpoint._id}`,
            breakpoint,
          );
        }

        await pipeline.exec();
      }
    } else {
      await this.removeReelFromRedis(reel._id.toString(), lang, dialect);
    }
  }

  async addUserEngagementInReels(
    reel: ReelResponseDto,
    userId: string,
  ): Promise<ReelResponseDto> {
    let episodeSlugs: string[] = [];
    if (reel.contentType === ContentType.SHOW) {
      const episodes = await this.episodesRepository.find(
        {
          showSlug: reel.contentSlug,
        },
        ['slug'],
        { cache: { enabled: true }, lean: true },
      );
      episodeSlugs = episodes?.map((episode) => episode.slug) || [];
    }
    const continueWatchingList = await this.watchVideoEventRepository.findOne(
      {
        content_slug: { $in: episodeSlugs },
        user_id: userId,
      },
      undefined,
    );
    const reelAction = await this.reelActionRepository.findOne({
      reelId: reel._id.toString(),
      userId: userId,
    });

    const shareCount = reelAction?.shareCount
      ? reel.shareCount + 1
      : reel.shareCount;
    const likesCount = reelAction?.liked
      ? reel.likesCount + 1
      : reel.likesCount;

    return {
      ...reel,
      continueWatching: continueWatchingList?.content_slug ? true : false,
      isLiked: reelAction?.liked || false,
      likesCount,
      shareCount,
    };
  }

  async getBreakPointReels(
    contentSlug: string,
    contentType: ContentType,
    lang: Lang,
  ): Promise<ReelResponseDto | null> {
    let content = null;
    if (contentType === ContentType.SHOW) {
      content = await this.showRepository.findOne(
        {
          displayLanguage: lang,
          slug: contentSlug,
        },
        undefined,
        { cache: { enabled: true } },
      );
      if (content) {
        return {
          _id: content?._id.toString(),
          contentGenreList: content?.genreList.map((genre) => genre.name),
          contentId: content?._id,
          contentSlug: content?.slug,
          contentThumbnail: content?.thumbnail,
          contentTitle: content?.title,
          contentType: contentType,
          continueWatching: false,
          description: content?.description,
          duration: content?.duration,
          id: content?._id.toString(),
          isLiked: false,
          likesCount: 0,
          plotKeywords: [],
          reelType: ReelType.BREAKPOINT,
          shareCount: 0,
          status: ReelStatusEnum.PUBLISHED,
          thumbnail: null,
          title: suggestionTitle[lang] + content?.genreList[0].name,
          type: 'breakpoint',
          viewCount: 0,
          visionularHLS: '',
        };
      }
    } else {
      content = await this.episodesRepository.findOne(
        {
          displayLanguage: lang,
          slug: contentSlug,
          type: ContentType.MOVIE,
        },
        undefined,
        { cache: { enabled: true } },
      );
      if (content) {
        return {
          _id: content?._id.toString(),
          contentGenreList: content?.genreList.map((genre) => genre.name),
          contentId: content?._id,
          contentSlug: content?.slug,
          contentThumbnail: content?.thumbnail,
          contentTitle: content?.title,
          contentType: contentType,
          continueWatching: false,
          description: content?.description,
          duration: content?.duration,
          id: content?._id.toString(),
          isLiked: false,
          likesCount: 0,
          plotKeywords: [],
          reelType: ReelType.BREAKPOINT,
          shareCount: 0,
          status: ReelStatusEnum.PUBLISHED,
          thumbnail: null,
          title: suggestionTitle[lang] + content?.genreList[0].name,
          type: 'breakpoint',
          viewCount: 0,
          visionularHLS: '',
        };
      }
    }
    return null;
  }

  async getReelById(
    reelId: string,
    dialect: Dialect,
    lang: Lang,
    userId?: string,
  ): Promise<ReelResponseDto> {
    const reel = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.reelRepository.findOneOrFail({
        _id: new ObjectId(reelId),
        status: ReelStatusEnum.PUBLISHED,
      }),
      Errors.REEL.REEL_NOT_FOUND(),
    );
    const reelResponse = await this.getReelInResponseFormat(
      reel,
      reel.dialect,
      lang,
    );
    if (!reelResponse) {
      throw Errors.REEL.REEL_NOT_FOUND();
    }

    if (userId) {
      return this.addUserEngagementInReels(reelResponse, userId);
    }

    return reelResponse;
  }

  async getReelFromRedis(
    reelId: string,
    lang: Lang,
    dialect: Dialect,
  ): Promise<ReelResponseDto | null> {
    const key = `${dialect}:reels:${reelId}:${lang}`;
    return await this.redisService.jsonGet<ReelResponseDto>(key);
  }

  async getReelInResponseFormat(
    item: ReelEntity,
    dialect: Dialect,
    lang: Lang,
  ): Promise<ReelResponseDto | null> {
    let contentDetails = null;
    let episodeDetails = null;
    if (item.contentType === ContentType.SHOW) {
      contentDetails = await this.showRepository.findOne(
        {
          displayLanguage: lang,
          language: dialect,
          slug: item.contentSlug,
        },
        ['_id', 'title', 'genreList', 'thumbnail'],
        { cache: { enabled: true }, lean: true },
      );
      episodeDetails = await this.episodesRepository.findOne(
        {
          displayLanguage: lang,
          language: dialect,
          showSlug: item.contentSlug,
        },
        ['_id', 'seasonId', 'showId'],
        { cache: { enabled: true }, lean: true },
      );
    } else {
      contentDetails = await this.episodesRepository.findOne(
        {
          displayLanguage: lang,
          language: dialect,
          slug: item.contentSlug,
        },
        ['_id', 'title', 'genreList', 'thumbnail'],
        { cache: { enabled: true }, lean: true },
      );
    }
    if (!contentDetails) {
      return null;
    }
    const visionularHLS = `https://media.stage.in/reels/${item.contentType}/${item.contentSlug}/reels/HLS/${item.visionularHls?.hlsSourcelink}`;
    // Use fixed values in test environment for consistent snapshots
    const randomNumber1 = APP_CONFIGS.IS_TEST
      ? 10000
      : Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    const randomNumber2 = APP_CONFIGS.IS_TEST
      ? 10000
      : Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    return {
      _id: item._id.toString(),
      contentGenreList: contentDetails?.genreList.map((genre) => genre.name),
      contentId: contentDetails?._id,
      contentSlug: item.contentSlug,
      contentThumbnail: contentDetails?.thumbnail,
      contentTitle: contentDetails?.title,
      contentType: item.contentType,
      continueWatching: false,
      description: item.description[lang],
      duration: item.duration,
      episodeId: episodeDetails?._id,
      id: item._id.toString(),
      isLiked: false,
      likesCount: randomNumber2,
      plotKeywords: item.plotKeywords[lang],
      reelType: item.reelType,
      seasonId: episodeDetails?.seasonId,
      shareCount: randomNumber1,
      status: item.status,
      thumbnail: item.thumbnail
        ? {
            ratio_9_16: item.thumbnail.ratio_9_16[lang],
          }
        : null,
      title: item.title[lang],
      type: ContentType.REEL,
      viewCount: item.views || 0,
      visionularHLS,
    };
  }

  async getReels({
    dialect,
    lang,
    lastReelId,
    userId,
  }: GetAllReelsParams): Promise<ReelsResponse> {
    const cachedReels: ReelResponseDto[] = [];
    const items = await this.redisService.smembers(
      `${dialect}:user:${userId}:list`,
    );
    this.logger.warn(
      `Items for reel for user from recommendation list ${userId}: ${JSON.stringify(items)}`,
    );
    if (!lastReelId) {
      await this.redisService.setNumber(`${dialect}:user:${userId}:counter`, 0);
    } else {
      await this.redisService.incr(`${dialect}:user:${userId}:counter`);
    }
    if (items.length === 0) {
      const items = await this.redisService.zrevrange(
        `${dialect}:statistical`,
        0,
        this.DEFAULT_BATCH_SIZE - 1,
        false,
      );
      this.logger.warn(
        `Items for reel for user from statistical list ${userId}: ${JSON.stringify(items)}`,
      );
      for (const item of items) {
        const reel = await this.getReelFromRedis(item, lang, dialect);
        if (reel) {
          cachedReels.push(reel);
        }
      }
      await this.redisService.set(
        `${dialect}:user:${userId}:watched:${EngagementWeightsEnum.statistical}`,
        cachedReels[cachedReels.length - 1]._id,
      );
    } else {
      for (const item of items) {
        const reel = await this.getReelFromRedis(item, lang, dialect);
        if (reel) {
          cachedReels.push(reel);
        }
      }
    }

    const counter = await this.redisService.get(
      `${dialect}:user:${userId}:counter`,
    );
    const breakpoint = this.reelsRecommendationService.getBreakpoint(
      parseInt(counter || '0'),
    );
    if (breakpoint) {
      const breakpointReels = cachedReels[breakpoint - 1];
      if (breakpointReels && breakpointReels.contentId) {
        const breakpointReel = await this.redisService.jsonGet<ReelResponseDto>(
          `${dialect}:breakpoint:${breakpointReels.contentId}`,
        );
        if (breakpointReel) {
          cachedReels.splice(breakpoint, 0, breakpointReel);
        }
      }
    }

    const previousList = cachedReels.map((item) => item._id);
    const pipeline = await this.redisService.getPipeline();
    if (previousList.length > 0) {
      pipeline.del(`${dialect}:user:${userId}:previous_list`);
      pipeline.sadd(`${dialect}:user:${userId}:previous_list`, ...previousList);
    }
    await pipeline.exec();
    this.reelsRecommendationService.generateReelsForUser(userId, dialect, lang);

    return {
      hasNext: true,
      hasPrevious: false,
      items: await Promise.all(
        cachedReels.map((item) => this.addUserEngagementInReels(item, userId)),
      ),
    };
  }

  async registerActionReels({
    dialect,
    registerActionReelsRequestDto,
    userId,
  }: {
    registerActionReelsRequestDto: RegisterActionReelsRequestDto;
    userId: string;
    dialect: Dialect;
  }) {
    const { action, reelId } = registerActionReelsRequestDto;

    await this.reelRepository.findOneOrFail(
      {
        _id: new ObjectId(reelId),
      },
      {
        failHandler: () => Errors.REEL.REEL_NOT_FOUND(),
      },
    );
    const reelAction = await this.reelActionRepository.findOne({
      reelId,
      userId,
    });

    if (!reelAction) {
      const newReelAction = await this.reelActionRepository.create({
        liked: action === ReelInteractionType.LIKE,
        reelId,
        shareCount: action === ReelInteractionType.SHARE ? 1 : 0,
        userId,
        viewCount: 1,
      });
      await this.reelActionRepository
        .getEntityManager()
        .persistAndFlush(newReelAction);

      return { success: true };
    }

    const { LIKE, SHARE } = APP_CONFIGS.RECOMMENDATION.REELS.ENGAGEMENT_SCORE;

    switch (action) {
      case ReelInteractionType.LIKE: {
        reelAction.liked = !reelAction.liked;
        const score = reelAction.liked ? LIKE : -1 * LIKE;
        this.reelsRecommendationService.addUserEngagementScore(
          userId,
          reelId,
          score,
          dialect,
        ); // need not to await for scoring

        this.reelsRecommendationService.updateUserBoostScore(userId, dialect);
        reelAction.liked = true;
        break;
      }
      case ReelInteractionType.SHARE:
        this.reelsRecommendationService.addUserEngagementScore(
          userId,
          reelId,
          SHARE,
          dialect,
        ); // need not to await for scoring

        this.reelsRecommendationService.updateUserBoostScore(userId, dialect);
        reelAction.shareCount = reelAction.shareCount + 1;
        break;
      case ReelInteractionType.VIEW:
        reelAction.viewCount = reelAction.viewCount + 1;
        break;
    }
    if (action !== ReelInteractionType.VIEW) {
      const reelEn = await this.redisService.jsonGet<ReelResponseDto>(
        `${dialect}:reels:${reelId}:en`,
      );
      const reelHin = await this.redisService.jsonGet<ReelResponseDto>(
        `${dialect}:reels:${reelId}:hin`,
      );
      if (reelEn && reelHin) {
        const shareCount = (reelEn.shareCount || 0) + 1;
        const likesCount = (reelEn.likesCount || 0) + 1;
        if (action === ReelInteractionType.SHARE) {
          reelEn.shareCount = shareCount;
          reelHin.shareCount = shareCount;
        } else if (action === ReelInteractionType.LIKE) {
          reelEn.likesCount = likesCount;
          reelHin.likesCount = likesCount;
        }
        await this.redisService.jsonSet(
          `${dialect}:reels:${reelId}:en`,
          reelEn,
        );
        await this.redisService.jsonSet(
          `${dialect}:reels:${reelId}:hin`,
          reelHin,
        );
      }
    }

    await this.reelActionRepository
      .getEntityManager()
      .persistAndFlush(reelAction);

    return {
      success: true,
    };
  }

  async removeReelFromRedis(reelId: string, lang: Lang, dialect: Dialect) {
    const key = `${dialect}:reels:${reelId}:${lang}`;
    const reel = await this.redisService.jsonGet<ReelResponseDto>(key);
    if (!reel) {
      return;
    }
    const pipeline = await this.redisService.getPipeline();
    pipeline.del(key);
    pipeline.zrem(`${dialect}:statistical`, reel._id);
    pipeline.srem(
      `${dialect}:content:${reel.contentType}_${reel.contentSlug}:reels`,
      reel._id,
    );
    // TODO: remove from genre:reels:genreID set here
    reel.contentGenreList.forEach((genre) => {
      pipeline.srem(`${dialect}:genre:${genre}:reels`, reel._id);
    });

    pipeline.del(`${dialect}:breakpoint:${reel._id}`);
    await pipeline.exec();
  }

  async watchProgressReels({
    dialect,
    meta,
    userId,
    watchProgressReelsRequestDto,
  }: {
    watchProgressReelsRequestDto: WatchProgressReelsRequestDto;
    meta: Meta;
    userId: string;
    dialect: Dialect;
  }) {
    const { count, reelId, reelTimestamp, totalDuration, watchDuration } =
      watchProgressReelsRequestDto;
    const { appId, os } = meta;

    this.eventsService.trackEvent({
      app_client_id: appId,
      key: Events.WATCH_REEL,
      os,
      payload: {
        count,
        reel_id: reelId,
        total_duration: totalDuration,
        watch_duration: watchDuration,
        watch_timestamp: reelTimestamp,
      },
      user_id: userId,
    });

    const {
      HIGH_ENGAGEMENT_VIEW,
      LOW_ENGAGEMENT_VIEW,
      MEDIUM_ENGAGEMENT_VIEW,
      ZERO_ENGAGEMENT_VIEW,
    } = APP_CONFIGS.RECOMMENDATION.REELS.ENGAGEMENT_SCORE;

    let engagementScore: number = ZERO_ENGAGEMENT_VIEW;

    if (watchDuration >= totalDuration * 0.7) {
      engagementScore = HIGH_ENGAGEMENT_VIEW;
    } else if (
      totalDuration * 0.7 > watchDuration &&
      watchDuration >= totalDuration * 0.3
    ) {
      engagementScore = MEDIUM_ENGAGEMENT_VIEW;
    } else if (
      totalDuration * 0.3 > watchDuration &&
      watchDuration >= totalDuration * 0.1
    ) {
      engagementScore = LOW_ENGAGEMENT_VIEW;
    } else {
      engagementScore = ZERO_ENGAGEMENT_VIEW;
    }

    Promise.all([
      this.reelsRecommendationService.addUserEngagementScore(
        userId,
        reelId,
        engagementScore,
        dialect,
      ), // need not to await for scoring
      this.reelsRecommendationService.addUserWatchedData(
        userId,
        reelId,
        reelTimestamp,
        dialect,
      ),
      this.reelsRecommendationService.updateUserBoostScore(userId, dialect),
    ]);

    return {
      success: true,
    };
  }
}
