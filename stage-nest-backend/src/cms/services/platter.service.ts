import { Injectable, Logger } from '@nestjs/common';

import type { PlatterContentDTO, UpdatePlatterDTO } from '../dtos/platter.dto';
import { ContentRepository } from '../repositories/content.repository';
import { EpisodeRepository } from '../repositories/episode.repository';
import { PlatterRepository } from '../repositories/platter.repositoty';
import { ShowRepository } from '../repositories/show.repository';

import { CacheManagerService } from '@app/cache-manager';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ErrorHandlerService } from '@app/error-handler';
import {
  CombinedPlatterEpisode,
  CombinedPlatterType,
} from 'common/entities/combined-platter.entity';
import { CombinedPlatterShow } from 'common/entities/combined-platter.entity';
import {
  Episode,
  EpisodeStatus,
  EpisodeType,
} from 'common/entities/episode.entity';
import { Show, ShowStatus } from 'common/entities/show-v2.entity';
import { ContentType, ContentTypeV2 } from 'common/enums/common.enums';

@Injectable()
export class PlatterService {
  private readonly logger = new Logger(PlatterService.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly showRepository: ShowRepository,
    private readonly episodeRepository: EpisodeRepository,
    private readonly platterRepository: PlatterRepository,
    private readonly errorService: ErrorHandlerService,
    private readonly cacheManager: CacheManagerService,
  ) {}

  async getContent(dialect: Dialect): Promise<PlatterContentDTO[]> {
    const shows = await this.showRepository.find(
      {
        displayLanguage: Lang.EN,
        language: dialect,
        status: ShowStatus.ACTIVE,
      },
      { orderBy: { _id: -1 } },
    );

    const movies = await this.episodeRepository.find(
      {
        displayLanguage: Lang.EN,
        language: dialect,
        status: EpisodeStatus.ACTIVE,
        type: EpisodeType.INDIVIDUAL,
      },
      { orderBy: { _id: -1 } },
    );

    const showDTOs: PlatterContentDTO[] = shows.map((show: Show) => ({
      id: show._id,
      slug: show.slug,
      thumbnail: {
        horizontal:
          show.allThumbnails?.[show.defaultThumbnailIndex]?.horizontal?.ratio1
            ?.sourceLink || '',
        square:
          show.allThumbnails?.[show.defaultThumbnailIndex]?.square?.ratio1
            ?.sourceLink || '',
      },
      title: show.title,
      type: ContentTypeV2.SHOW,
    }));

    const movieDTOs: PlatterContentDTO[] = movies.map((movie: Episode) => ({
      id: movie._id,
      slug: movie.slug,
      thumbnail: {
        horizontal:
          movie.allThumbnails?.[movie.defaultThumbnailIndex]?.horizontal?.ratio1
            ?.sourceLink || '',
        square:
          movie.allThumbnails?.[movie.defaultThumbnailIndex]?.square?.ratio1
            ?.sourceLink || '',
      },
      title: movie.title,
      type: ContentTypeV2.MOVIE,
    }));

    const combinedContent = [...showDTOs, ...movieDTOs];

    return combinedContent;
  }

  async getPlatterDetails(type: CombinedPlatterType, dialect: Dialect) {
    const platterDetails = await this.platterRepository.findOneOrFail({
      dialect,
      lang: Lang.EN,
      type,
    });
    return {
      items: platterDetails.all.map((item) => {
        return {
          contentType: item.contentType,
          slug: item.slug,
          thumbnail: item.allThumbnails[item.defaultThumbnailIndex].square,
        };
      }),
    };
  }

  async removeContentFromPlatters(slug: string): Promise<void> {
    const platters = await this.platterRepository.find({});

    const plattersToUpdate = [];

    for (const platter of platters) {
      const originalLength = platter.all.length;
      platter.all = platter.all.filter((item) => item.slug !== slug);

      if (platter.all.length < originalLength) {
        plattersToUpdate.push(platter);
      }
    }

    if (plattersToUpdate.length < 1) return;

    await Promise.all(
      plattersToUpdate.map((platter) => this.platterRepository.save(platter)),
    );
  }

  async updateContent(payload: UpdatePlatterDTO) {
    const showSlugs = payload.contents
      .filter((c) => c.type === ContentType.SHOW)
      .map((c) => c.slug);
    const movieSlugs = payload.contents
      .filter((c) => c.type === ContentType.MOVIE)
      .map((c) => c.slug);

    const [platters, shows, episodes] = await Promise.all([
      this.platterRepository.find({
        dialect: payload.dialect,
        type: payload.platterType,
      }),
      this.showRepository.find({
        slug: { $in: showSlugs },
        status: ShowStatus.ACTIVE,
      }),
      this.episodeRepository.find({
        slug: { $in: movieSlugs },
        status: EpisodeStatus.ACTIVE,
        type: EpisodeType.INDIVIDUAL,
      }),
    ]);

    // if (platters.length === 0 || shows.length === 0 || episodes.length === 0) {
    //   throw new Error('Possibly platter/show/episode any of them are missing');
    // }

    for (const platter of platters) {
      const showsFilteredByLanguage = shows.filter(
        (s) => s.displayLanguage === platter.lang,
      );
      const moviesFilteredByLanguage = episodes.filter(
        (e) => e.displayLanguage === platter.lang,
      );
      const contents: (CombinedPlatterShow | CombinedPlatterEpisode)[] = [];

      await Promise.all(
        payload.contents.map(async (payloadContent) => {
          const isShow = payloadContent.type === ContentType.SHOW;
          const selectedContent = isShow
            ? this.errorService.raiseErrorIfNull(
                showsFilteredByLanguage.find(
                  (s) => s.slug === payloadContent.slug,
                ),
                new Error('Show not found for hindi language'),
              )
            : this.errorService.raiseErrorIfNull(
                moviesFilteredByLanguage.find(
                  (m) => m.slug === payloadContent.slug,
                ),
                new Error(`Movies not found for ${platter.lang} language`),
              );

          contents.push(
            isShow
              ? ({
                  ...selectedContent,
                  contentType: 'show',
                  defaultImage: false,
                  defaultThumbnailIndex:
                    selectedContent.defaultThumbnailIndex || 0,
                  id: selectedContent._id,
                  showId: selectedContent._id, // for backward compatibility
                  showSlug: selectedContent.slug, // for backward compatibility
                  type: 'show',
                } as CombinedPlatterShow)
              : ({
                  ...selectedContent,
                  contentType: 'individual',
                  defaultImage: false,
                  defaultThumbnailIndex:
                    selectedContent.defaultThumbnailIndex || 0,
                  id: selectedContent._id,
                } as CombinedPlatterEpisode),
          );
          platter.all = contents;
          await this.platterRepository.save(platter);
        }),
      );
    }

    await this.cacheManager
      .deleteByPattern(`*/home/getPlatterData*`)
      .catch((error) => {
        this.logger.error(
          { error },
          'Failed to invalidate platterListing cache',
        );
      });
  }
}
