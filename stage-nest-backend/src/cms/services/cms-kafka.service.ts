import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  PreviewContentCohortUpdateEvent,
  VideoQcRequestedEvent,
} from '../dtos/kafka-events.dto';
import { VideoQcEventResponseDto } from '../dtos/video-qc.dto';
import { EpisodeRepository } from '../repositories/episode.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { ShowRepository } from '../repositories/show.repository';
import { KafkaService } from '@app/kafka';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Episode } from 'common/entities/episode.entity';
import { Show } from 'common/entities/show-v2.entity';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

@Injectable()
export class CmsKafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CmsKafkaService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly episodeRepository: EpisodeRepository,
    private readonly showRepository: ShowRepository,
    private readonly rawMediaRepository: RawMediaRepository,
  ) {}

  private async getContentId(
    type: ContentTypeV2,
    dialect: Dialect,
    contentSlug: string,
  ) {
    let contentId = -1;

    switch (type) {
      case ContentTypeV2.MOVIE: {
        const episode = await this.episodeRepository
          .getEntityManager()
          .fork()
          .findOneOrFail(Episode, {
            language: dialect,
            slug: contentSlug,
          });
        contentId = episode._id;
        break;
      }
      case ContentTypeV2.SHOW: {
        const show = await this.showRepository
          .getEntityManager()
          .fork()
          .findOneOrFail(Show, {
            language: dialect,
            slug: contentSlug,
          });
        contentId = show._id;
        break;
      }
    }
    return contentId;
  }

  async notifyOnContentCohortUpdate({
    action,
    contentSlug,
    dialect,
    type,
    userIds,
  }: {
    contentSlug: string;
    userIds: string[];
    action: 'added' | 'removed';
    type: ContentTypeV2;
    dialect: Dialect;
  }) {
    const BATCH_SIZE = 100;
    const batches = [];
    const contentId = await this.getContentId(type, dialect, contentSlug);

    this.logger.log(
      {
        contentId,
        contentSlug,
        dialect,
        type,
        userIds,
      },
      'Producing preview content cohort update event',
    );

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
      batches.push(
        this.kafkaService.produce<PreviewContentCohortUpdateEvent>(
          APP_CONFIGS.KAFKA.PREVIEW_CONTENT,
          [
            {
              value: {
                action,
                contentId,
                contentSlug,
                contentType: type,
                dialect,
                timestamp: Date.now(),
                userIds: batchUserIds,
              },
            },
          ],
        ),
      );
    }

    this.logger.log(
      `Produced preview content cohort update event for ${batches.length} batches`,
    );

    return Promise.all(batches);
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.IS_TEST) return;
    this.logger.log(
      `Initializing Kafka producer for cms topics ${APP_CONFIGS.KAFKA.PREVIEW_CONTENT}`,
    );
    this.kafkaService
      .connect()
      .then(() => {
        this.logger.log('Kafka producer connected in CMS');
      })
      .catch((error) => {
        this.logger.error('Error connecting to Kafka in CMS', error);
      });
  }

  async publishVideoQcEvent(
    payload: VideoQcRequestedEvent,
  ): Promise<VideoQcEventResponseDto> {
    await this.kafkaService.produce<VideoQcRequestedEvent>(
      APP_CONFIGS.KAFKA.CMS_VIDEO_QC_TOPIC,
      [
        {
          value: payload,
        },
      ],
    );

    return {
      projectId: payload.projectId,

      topic: APP_CONFIGS.KAFKA.CMS_VIDEO_QC_TOPIC,
    };
  }
}
