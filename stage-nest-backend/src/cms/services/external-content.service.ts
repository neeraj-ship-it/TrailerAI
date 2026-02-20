import { Injectable, Logger } from '@nestjs/common';

import { PublishEpisodeDto } from '../dtos/external-content.dto';
import { EpisodeRepository } from '../repositories/episode.repository';
import { validateEpisodeForPublishing } from '../utils/content-schema-validators.utils';
import { Lang } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import {
  Episode,
  EpisodeStatus,
  EpisodeType,
} from 'common/entities/episode.entity';

@Injectable()
export class ExternalContentService {
  private readonly logger = new Logger(ExternalContentService.name);

  constructor(
    private readonly episodeRepository: EpisodeRepository,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async publishEpisode(payload: PublishEpisodeDto): Promise<void> {
    const { dialect, format, slug } = payload;

    this.logger.log(`Publishing episode ${slug} for ${payload.contentType}`);

    const forkedEpisodeRepo = this.episodeRepository.getEntityManager().fork();

    const episodes = this.errorHandler.raiseErrorIfNull(
      await forkedEpisodeRepo.find(Episode, {
        format,
        language: dialect,
        slug,
        type: EpisodeType.SEASON,
      }),
      Errors.EPISODE.NOT_FOUND('Episodes not found'),
    );

    await forkedEpisodeRepo.findOneOrFail(Episode, {
      episodeOrder: episodes[0].episodeOrder - 1,
      format,
      language: dialect,
      showSlug: episodes[0].showSlug,
      status: EpisodeStatus.ACTIVE,
      type: EpisodeType.SEASON,
    });

    if (episodes.length !== Object.values(Lang).length) {
      throw Errors.EPISODE.INVALID_EPISODE_COUNT(
        `Expected ${Object.values(Lang).length} episodes, got ${episodes.length}`,
      );
    }

    episodes.forEach((episode) => {
      validateEpisodeForPublishing(episode, format);
    });

    await Promise.all(
      episodes.map((episode) => {
        episode.status = EpisodeStatus.ACTIVE;
        episode.isComingSoon = 0;
        episode.releaseDate = episode.comingSoonDate;
        return forkedEpisodeRepo.persistAndFlush(episode);
      }),
    );
  }
}
