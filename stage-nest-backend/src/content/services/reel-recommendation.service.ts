import { Injectable, Logger } from '@nestjs/common';

import { ReelResponseDto } from '../dto/reels.dto';
import {
  ENGAGEMENT_WEIGHTS,
  EngagementLevel,
  EngagementWeightsEnum,
} from './reels.service';
import { EventService } from '@app/events';
import { ComplexRedisService } from '@app/redis/stores/complex-redis.service';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Dialect, Lang } from 'common/enums/app.enum';

export enum UserKeyType {
  ENGAGEMENT = 'engagement_score',
  LAST_WATCHED = 'last_watched',
  WATCHED = 'watched',
}

@Injectable()
export class ReelsRecommendationService {
  private readonly logger = new Logger(ReelsRecommendationService.name);
  private readonly TEN_DAYS_TTL = APP_CONFIGS.CACHE.TTL.TEN_DAYS;

  constructor(
    private readonly eventsService: EventService,
    private readonly redisService: ComplexRedisService,
  ) {}

  async addReelStaticalScore(reelId: string, score: number, dialect: Dialect) {
    const key = `${dialect}:statistical`;
    await this.redisService.zadd(key, score, reelId);
  }

  async addUserEngagementScore(
    userId: string,
    reelId: string,
    score: number,
    dialect: Dialect,
  ) {
    const key = await this.generateUserKey(
      userId,
      UserKeyType.ENGAGEMENT,
      dialect,
    );
    const scoreValue = await this.redisService.zscore(key, reelId);
    const currentScore = scoreValue ? parseInt(scoreValue) : 0;

    const newScore = currentScore ? currentScore + score : score;
    await this.redisService.zadd(key, newScore, reelId);
  }
  async addUserWatchedData(
    userId: string,
    reelId: string,
    timestamp: number,
    dialect: Dialect,
  ) {
    // set last watched
    const lastWatchedKey = await this.generateUserKey(
      userId,
      UserKeyType.LAST_WATCHED,
      dialect,
    );
    this.redisService.set(lastWatchedKey, reelId);

    // add to watched
    const watchedKey = await this.generateUserKey(
      userId,
      UserKeyType.WATCHED,
      dialect,
    );
    await this.redisService.zadd(watchedKey, timestamp, reelId);
  }

  findMostRepeatedItem(arr: string[]): string | undefined {
    if (arr.length === 0) {
      return undefined;
    }
    const frequencyMap = new Map<string, number>();
    for (const item of arr) {
      frequencyMap.set(item, (frequencyMap.get(item) || 0) + 1);
    }
    let mostRepeatedItem: string | undefined = undefined;
    let maxCount = 0;
    for (const [item, count] of frequencyMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostRepeatedItem = item;
      }
    }
    return mostRepeatedItem;
  }
  async generateReelsForUser(userId: string, dialect: Dialect, lang: Lang) {
    const userBoost = await this.redisService.zrange(
      `${dialect}:user:${userId}:boost`,
      0,
      3,
      true,
    );
    if (userBoost.length > 0) {
      const [serendipityScore, similarityScore, statisticalScore] =
        await Promise.all([
          this.redisService.zscore(
            `${dialect}:user:${userId}:boost`,
            EngagementWeightsEnum.serendipity,
          ),
          this.redisService.zscore(
            `${dialect}:user:${userId}:boost`,
            EngagementWeightsEnum.similarity,
          ),
          this.redisService.zscore(
            `${dialect}:user:${userId}:boost`,
            EngagementWeightsEnum.statistical,
          ),
        ]);
      if (serendipityScore && similarityScore && statisticalScore) {
        this.getReelsBasedOnBoost(
          userId,
          parseInt(serendipityScore),
          parseInt(similarityScore),
          parseInt(statisticalScore),
          dialect,
          lang,
        );
      }
    } else {
      await Promise.all([
        this.redisService.zadd(
          `${dialect}:user:${userId}:boost`,
          ENGAGEMENT_WEIGHTS.BASELINE.serendipity,
          EngagementWeightsEnum.serendipity,
        ),
        this.redisService.zadd(
          `${dialect}:user:${userId}:boost`,
          ENGAGEMENT_WEIGHTS.BASELINE.similarity,
          EngagementWeightsEnum.similarity,
        ),
        this.redisService.zadd(
          `${dialect}:user:${userId}:boost`,
          ENGAGEMENT_WEIGHTS.BASELINE.statistical,
          EngagementWeightsEnum.statistical,
        ),
      ]);
      await this.getReelsBasedOnBoost(
        userId,
        ENGAGEMENT_WEIGHTS.BASELINE.serendipity,
        ENGAGEMENT_WEIGHTS.BASELINE.similarity,
        ENGAGEMENT_WEIGHTS.BASELINE.statistical,
        dialect,
        lang,
      );
    }
  }

  async generateUserKey(userId: string, type: UserKeyType, dialect: Dialect) {
    return `${dialect}:user:${userId}:${type}`;
  }
  getBreakpoint(counter: number): number | null {
    if (counter === 0) {
      return 7;
    } else {
      return Math.floor(Math.random() * (10 - 8 + 1)) + 8;
    }
  }

  async getReelsBasedOnBoost(
    userId: string,
    serendipityScore: number,
    similarityScore: number,
    statisticalScore: number,
    dialect: Dialect,
    lang: Lang,
  ) {
    const recommendationList = 10;
    const maxIterations = 4;
    const lastReelItems = await this.redisService.smembers(
      `${dialect}:user:${userId}:previous_list`,
    );
    const allWatchedReels = await this.redisService.zrevrange(
      `${dialect}:user:${userId}:watched`,
      0,
      -1,
      false,
    );

    const watchedReels = new Set<string>();

    allWatchedReels.forEach((reel) => watchedReels.add(reel));
    lastReelItems.forEach((reel) => watchedReels.add(reel));

    const uniqueReels = new Set<string>();

    const statisticalItemCount = (statisticalScore / 100) * recommendationList;

    const lastStatisticalRankValue = await this.redisService.get(
      `${dialect}:user:${userId}:last_statistical_rank`,
    );
    const lastSerendipityRankValue = await this.redisService.get(
      `${dialect}:user:${userId}:last_serendipity_rank`,
    );

    let statisticalRevRangeRank = parseInt(lastStatisticalRankValue ?? '0');
    let serendipityRevRangeRank = parseInt(lastSerendipityRankValue ?? '0');

    let statisticalReelItems = 0;
    let iterations = 0;
    while (
      statisticalReelItems < statisticalItemCount &&
      iterations < maxIterations
    ) {
      const statisticalReels = await this.redisService.zrevrange(
        `${dialect}:statistical`,
        statisticalRevRangeRank,
        statisticalRevRangeRank + statisticalItemCount - 1,
        false,
      );
      statisticalRevRangeRank = statisticalRevRangeRank + statisticalItemCount; // increase the rank by the number of items to be added
      if (statisticalReels.length === 0) break; // Break if no more reels found

      const filteredStatisticalReels = statisticalReels.filter(
        (reel) => !watchedReels.has(reel),
      );
      filteredStatisticalReels.forEach((reel) => uniqueReels.add(reel));
      statisticalReelItems =
        statisticalReelItems + filteredStatisticalReels.length;
      iterations++;
    }

    const serendipityItemCount =
      (serendipityScore / 100) * recommendationList +
      (statisticalItemCount - statisticalReelItems);

    let serendipityReelItems = 0;
    iterations = 0;
    while (
      serendipityReelItems < serendipityItemCount &&
      iterations < maxIterations
    ) {
      const serendipityReels = await this.redisService.zrevrange(
        `${dialect}:serendipity`,
        serendipityRevRangeRank,
        serendipityRevRangeRank + serendipityItemCount - 1,
        false,
      );
      serendipityRevRangeRank = serendipityRevRangeRank + serendipityItemCount; // increase the rank by the number of items to be added
      if (serendipityReels.length === 0) break; // Break if no more reels found

      const filteredSerendipityReels = serendipityReels.filter(
        (reel) => !watchedReels.has(reel),
      );
      filteredSerendipityReels.forEach((reel) => uniqueReels.add(reel));
      serendipityReelItems =
        serendipityReelItems + filteredSerendipityReels.length;
      iterations++;
    }

    // store the last rank
    const pipeline = await this.redisService.getPipeline();
    pipeline.set(
      `${dialect}:user:${userId}:last_statistical_rank`,
      statisticalRevRangeRank,
    );
    pipeline.set(
      `${dialect}:user:${userId}:last_serendipity_rank`,
      serendipityRevRangeRank,
    );
    await pipeline.exec();

    // Get similarity reels based on genre
    const reelItemsWatchedByUser = await this.redisService.zrevrange(
      `${dialect}:user:${userId}:watched`,
      0,
      10 - 1,
      false,
    );

    const engagementScores = await Promise.all(
      reelItemsWatchedByUser.map(async (reelId) => {
        const score = await this.redisService.zscore(
          `${dialect}:user:${userId}:${UserKeyType.ENGAGEMENT}`,
          reelId,
        );
        return { reelId, score: score ? parseInt(score) : 0 };
      }),
    );

    const topReelIds = engagementScores
      .sort((a, b) => b.score - a.score) // Sort by score in descending order
      .slice(0, 5) // Take top 5
      .map((item) => item.reelId); // Extract just the reelIds

    const reelItems = await Promise.all(
      topReelIds.map(async (reelId) => {
        const reel = await this.redisService.jsonGet<ReelResponseDto>(
          `${dialect}:reels:${reelId}:${lang}`,
        );
        return reel;
      }),
    );
    const reelGenres: string[] = [];
    reelItems.forEach((reel) =>
      reel?.contentGenreList.forEach((genre) => reelGenres.push(genre)),
    );
    const mostFrequentGenre = this.findMostRepeatedItem(reelGenres);

    if (mostFrequentGenre) {
      const genreReels = await this.redisService.smembers(
        `${dialect}:genre:${mostFrequentGenre}:reels`,
      );
      const similarityItemCount =
        (similarityScore / 100) * recommendationList +
        (serendipityItemCount - serendipityReelItems);

      let similarItemCount = 0;
      let genreItemCounter = 0;
      iterations = 0;
      while (
        similarItemCount < similarityItemCount &&
        uniqueReels.size < recommendationList &&
        iterations < maxIterations
      ) {
        const isBlackListed = watchedReels.has(genreReels[genreItemCounter]);

        if (!isBlackListed) {
          uniqueReels.add(genreReels[genreItemCounter]);
          similarItemCount++;
        }
        genreItemCounter++;
        iterations++;
      }
    }

    await this.redisService.del(`${dialect}:user:${userId}:list`);
    await this.redisService.sadd(
      `${dialect}:user:${userId}:list`,
      ...Array.from(uniqueReels),
    );
  }

  async getUserEngagementScore(
    userId: string,
    reelId: string,
    dialect: Dialect,
  ) {
    const key = await this.generateUserKey(
      userId,
      UserKeyType.ENGAGEMENT,
      dialect,
    );
    const currentScore = await this.redisService.zscore(key, reelId);
    return currentScore ? parseInt(currentScore) : 0;
  }

  async getUserLastWatchedData(userId: string, dialect: Dialect) {
    const lastWatchedKey = await this.generateUserKey(
      userId,
      UserKeyType.LAST_WATCHED,
      dialect,
    );
    return await this.redisService.get(lastWatchedKey);
  }

  async getUserWatchedData(userId: string, dialect: Dialect) {
    const watchedKey = await this.generateUserKey(
      userId,
      UserKeyType.WATCHED,
      dialect,
    );
    return await this.redisService.zrange(watchedKey, 0, -1);
  }

  async updateUserBoostScore(userId: string, dialect: Dialect) {
    const key = `${dialect}:user:${userId}:boost`;
    let engagementScore: EngagementLevel = 'NIL';
    const lastWatchedItems = await this.redisService.zrevrange(
      `${dialect}:user:${userId}:watched`,
      0,
      5,
      false,
    );
    const last5VideoTotalScore = await Promise.all(
      lastWatchedItems.map(async (item) => {
        const score = await this.redisService.zscore(
          `${dialect}:user:${userId}:${UserKeyType.ENGAGEMENT}`,
          item,
        );
        return score ? parseInt(score) : 0;
      }),
    );
    const totalScore = last5VideoTotalScore.reduce(
      (acc, curr) => acc + curr,
      0,
    );
    if (totalScore >= 20) {
      engagementScore = 'HIGH';
    } else if (totalScore >= 5) {
      engagementScore = 'MEDIUM';
    } else if (totalScore >= -4) {
      engagementScore = 'LOW';
    } else {
      engagementScore = 'NIL';
    }
    const engagementWeights = ENGAGEMENT_WEIGHTS[engagementScore];
    const statisticalScore = engagementWeights.statistical;
    const similarityScore = engagementWeights.similarity;
    const serendipityScore = engagementWeights.serendipity;
    const pipe = await this.redisService.getPipeline();
    pipe.zadd(key, statisticalScore, EngagementWeightsEnum.statistical);
    pipe.zadd(key, similarityScore, EngagementWeightsEnum.similarity);
    pipe.zadd(key, serendipityScore, EngagementWeightsEnum.serendipity);
    await pipe.exec();
    // await this.generateReelsForUser(userId, dialect, lang);
  }
}
