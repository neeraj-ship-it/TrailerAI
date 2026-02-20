import { BadRequestException, Injectable } from '@nestjs/common';

import { ContentRepository } from '../repositories/content.repository';
import { CmsKafkaService } from './cms-kafka.service';
import { ContentSensorRedisStore } from '@app/redis';
import { ContentStatus } from 'common/entities/contents.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

@Injectable()
export class ContentCensorService {
  constructor(
    private readonly contentSensorRedisStore: ContentSensorRedisStore,
    private readonly contentRepository: ContentRepository,
    private readonly cmsKafkaService: CmsKafkaService,
  ) {}

  async addUsersToPreviewContent({
    contentSlug,
    dialect,
    type,
    users,
  }: {
    contentSlug: string;
    users: string[];
    dialect: Dialect;
    type: ContentTypeV2;
  }) {
    const content = await this.contentRepository.findOneOrFail({
      contentType: type,
      dialect,
      slug: contentSlug,
    });

    if (content.status !== ContentStatus.PREVIEW_PUBLISHED) {
      throw new BadRequestException('Content is not in preview mode');
    }

    const result = await this.contentSensorRedisStore.addUsersToPreviewContent({
      dialect: content.dialect,
      slug: content.slug,
      type: content.contentType,
      users,
    });

    await this.cmsKafkaService.notifyOnContentCohortUpdate({
      action: 'removed',
      contentSlug: content.slug,
      dialect: content.dialect,
      type: content.contentType,
      userIds: result.removedUsers,
    });

    return result;
  }

  async generateAudienceList(
    contentSlug: string,
    dialect: Dialect,
    type: ContentTypeV2,
  ) {
    return this.contentSensorRedisStore.exportAudienceList({
      dialect,
      slug: contentSlug,
      type,
    });
  }

  async listContentsSlugsInPreviewMode(dialect: Dialect) {
    const contents = await this.contentRepository.find({
      dialect,
      language: Lang.EN,
      status: ContentStatus.PREVIEW_PUBLISHED,
    });
    const sensorList =
      await this.contentSensorRedisStore.listContentsSlugsInPreviewMode();

    const contentsWithSensorList = await Promise.all(
      contents.map(async (content) => {
        return {
          contentType: content.contentType,
          isAudienceAdded: sensorList.includes(content.slug),
          slug: content.slug,
          thumbnail: content.thumbnail.square?.ratio_1_1.sourceLink || '',
          title: content.title,
        };
      }),
    );

    return contentsWithSensorList;
  }
  async removePreviewContent(
    dialect: Dialect,
    slug: string,
    contentType: ContentTypeV2,
  ) {
    await this.contentSensorRedisStore.removePreviewContent({
      dialect,
      slug,
      type: contentType,
    });
  }

  async resetPreviewContent(
    dialect: Dialect,
    slug: string,
    contentType: ContentTypeV2,
  ) {
    const cohortUsers = await this.contentSensorRedisStore.exportAudienceList({
      dialect,
      slug,
      type: contentType,
    });

    this.cmsKafkaService.notifyOnContentCohortUpdate({
      action: 'removed',
      contentSlug: slug,
      dialect,
      type: contentType,
      userIds: cohortUsers,
    });

    await this.contentSensorRedisStore.removePreviewContent({
      dialect: dialect,
      slug,
      type: contentType,
    });
  }
}
