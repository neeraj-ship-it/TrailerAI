import { Injectable } from '@nestjs/common';

import { ChainableCommander } from 'ioredis';

import { ComplexRedisService } from './complex-redis.service';
import {
  RedisKeyUtils,
  RedisKeyBuilders,
  RedisKeyTemplate,
} from './redis-key.builder';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

@Injectable()
export class ContentSensorRedisStore {
  private readonly BATCH_SIZE = 1000; // Generic batch size for processing large arrays

  constructor(private readonly redisService: ComplexRedisService) {}

  private async addUsersInBatches(
    key: string,
    users: string[],
    existingPipeline?: ChainableCommander,
  ): Promise<void> {
    const pipeline =
      existingPipeline || (await this.redisService.getPipeline());

    this.addUsersToPipeline(pipeline, key, users);

    if (!existingPipeline) {
      await pipeline.exec();
    }
  }

  private addUsersToPipeline(
    pipeline: ChainableCommander,
    key: string,
    users: string[],
  ): void {
    for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
      const batch = users.slice(i, i + this.BATCH_SIZE);
      // Since we're already batching at BATCH_SIZE (1000), spread operator is safe and more efficient
      if (batch.length === 0) continue;
      pipeline.sadd(key, ...batch);
    }
  }

  // Private helper to update global cohort store from all content stores
  private async updateGlobalCohortStore() {
    const globalKey = RedisKeyBuilders.previewContent.cohortUsers();
    const contentKeys = await this.redisService.scanAll(
      RedisKeyUtils.getPattern(RedisKeyTemplate.PREVIEW_CONTENT),
    );

    const pipeline = await this.redisService.getPipeline();
    pipeline.del(globalKey);

    // Fetch users from all content keys concurrently for better performance
    const userArrays = await Promise.all(
      contentKeys.map((contentKey) => this.redisService.smembers(contentKey)),
    );

    // Process each user array and add to pipeline
    userArrays.forEach((users) => {
      if (users.length > 0) {
        this.addUsersToPipeline(pipeline, globalKey, users);
      }
    });

    await pipeline.exec();
  }

  async addToCohortUsers(users: string[]) {
    if (users.length === 0) return;

    const key = RedisKeyBuilders.previewContent.cohortUsers();
    return this.addUsersInBatches(key, users);
  }

  async addUsersToPreviewContent({
    dialect,
    slug,
    type,
    users,
  }: {
    slug: string;
    dialect: Dialect;
    type: ContentTypeV2;
    users: string[];
  }): Promise<{ removedUsers: string[] }> {
    const contentKey = RedisKeyBuilders.previewContent.content({
      dialect,
      slug,
      type: type,
    });

    const pipeline = await this.redisService.getPipeline();
    const currentUsers = await this.redisService.smembers(contentKey);

    const newUserSet = new Set(users);
    const removedUsers: string[] = [];

    for (let i = 0; i < currentUsers.length; i += this.BATCH_SIZE) {
      const batch = currentUsers.slice(i, i + this.BATCH_SIZE);
      batch.forEach((user) => {
        if (!newUserSet.has(user)) {
          removedUsers.push(user);
        }
      });
    }

    pipeline.del(contentKey);

    if (users.length > 0) {
      this.addUsersToPipeline(pipeline, contentKey, users);
    }

    await pipeline.exec();

    await this.updateGlobalCohortStore();

    return { removedUsers };
  }

  async exportAudienceList({
    dialect,
    slug,
    type,
  }: {
    slug: string;
    dialect: Dialect;
    type: ContentTypeV2;
  }) {
    return this.redisService.smembers(
      RedisKeyBuilders.previewContent.content({ dialect, slug, type }),
    );
  }

  async getAllPreviewContentKeys() {
    return this.redisService.scanAll(
      RedisKeyUtils.getPattern(RedisKeyTemplate.PREVIEW_CONTENT),
    );
  }

  async getCohortUsers() {
    return this.redisService.smembers(
      RedisKeyBuilders.previewContent.cohortUsers(),
    );
  }

  async getContentStoreStats() {
    const contentKeys = await this.redisService.scanAll(
      'preview-content:content:*',
    );
    const stats = [];

    for (const key of contentKeys) {
      const count = await this.redisService.scard(key);
      const slug = key.split(':')[2];
      stats.push({ slug, userCount: count });
    }

    const globalCount = await this.redisService.scard(
      RedisKeyBuilders.previewContent.cohortUsers(),
    );

    return {
      contentStores: stats,
      globalCohortCount: globalCount,
    };
  }

  async listContentsSlugsInPreviewMode() {
    const keys = await this.redisService.scanAll(
      RedisKeyUtils.getPattern(RedisKeyTemplate.PREVIEW_CONTENT),
    );
    return keys.map((key) => {
      const elements = key.split(':');
      return elements[elements.length - 1];
    });
  }

  async listFilteredContentsSlugsInPreviewMode(
    dialect: Dialect,
    contentTypes: ContentTypeV2,
  ) {
    const key = `preview-content:content:${dialect}:${contentTypes}:*`;
    const keys = await this.redisService.scanAll(key);
    return keys.map((key) => {
      const elements = key.split(':');
      return elements[elements.length - 1];
    });
  }

  async removePreviewContent({
    dialect,
    slug,
    type,
  }: {
    slug: string;
    dialect: Dialect;
    type: ContentTypeV2;
  }): Promise<void> {
    const contentKey = RedisKeyBuilders.previewContent.content({
      dialect,
      slug,
      type,
    });

    await this.redisService.del(contentKey);
    await this.updateGlobalCohortStore();
  }

  async usersInPreviewContent({
    dialect,
    slug,
    type,
    userId,
  }: {
    slug: string;
    dialect: Dialect;
    type: ContentTypeV2;
    userId: string;
  }) {
    return this.redisService.sismember(
      RedisKeyBuilders.previewContent.content({ dialect, slug, type }),
      userId,
    );
  }

  async usersPartOfPreviewContents({
    dialect,
    slugs,
    type,
    userId,
  }: {
    slugs: string[];
    dialect: Dialect;
    type: ContentTypeV2;
    userId: string;
  }): Promise<string[]> {
    const pipeline = await this.redisService.getPipeline();
    slugs.forEach((slug) => {
      pipeline.sismember(
        RedisKeyBuilders.previewContent.content({ dialect, slug, type }),
        userId,
      );
    });
    const results = await pipeline.exec();

    if (!results || results.length === 0) return [];

    const filteredSlugs = slugs.filter((_, i) => results[i][1] === 1);

    return filteredSlugs;
  }
}
