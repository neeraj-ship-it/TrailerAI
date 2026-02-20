import { FilterQuery } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import {
  ContentDataDto,
  GetDeeplinksResponseDto,
  GetDeeplinksRequestDto,
} from '../dtos/deeplink.dto';
import { ContentRepository } from '@app/cms/repositories/content.repository';
import {
  ContentStatus,
  ContentFormat,
  Contents,
} from '@app/common/entities/contents.entity';
import { Lang, Dialect } from '@app/common/enums/app.enum';
import {
  ContentTypeV2,
  DeeplinkContentType,
} from '@app/common/enums/common.enums';
import { EpisodesRepository } from 'src/content/repositories/episode.repository';

interface ContentFilterConditions {
  $or?: {
    title?: RegExp;
    slug?: RegExp;
    description?: RegExp;
    keywordSearch?: RegExp;
  }[];
  contentType?: ContentTypeV2;
  dialect?: Dialect;
  format?: ContentFormat | { $ne: ContentFormat };
  language?: Lang;
  status?: ContentStatus;
}

import { IDeeplinks } from '../interface/deeplink.interface';
import { EpisodeStatus } from '@app/common/entities/episode.entity';
import {
  generateMicroDramaDeeplinks,
  generateMovieDeeplinks,
  generateShowDeeplinks,
} from '@app/common/utils/deeplink.parser';
import { Errors } from '@app/error-handler';

@Injectable()
export class DeeplinkService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly episodesRepository: EpisodesRepository,
  ) {}

  private buildFilterConditions(
    query: GetDeeplinksRequestDto,
  ): FilterQuery<Contents> {
    const filterConditions: FilterQuery<Contents> = {
      status: { $in: [ContentStatus.ACTIVE, ContentStatus.PREVIEW_PUBLISHED] },
    };

    if (query.lang) {
      filterConditions.language = query.lang as Lang;
    }

    if (query.dialect) {
      filterConditions.dialect = query.dialect as Dialect;
    }

    if (query.contentType) {
      if (query.contentType === DeeplinkContentType.MOVIE) {
        filterConditions.contentType = ContentTypeV2.MOVIE;
      } else if (query.contentType === DeeplinkContentType.SHOW) {
        filterConditions.contentType = ContentTypeV2.SHOW;
        filterConditions.format = { $ne: ContentFormat.MICRO_DRAMA };
      } else if (query.contentType === DeeplinkContentType.MICRO_DRAMA) {
        filterConditions.contentType = ContentTypeV2.SHOW;
        filterConditions.format = ContentFormat.MICRO_DRAMA;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i'); // Case-insensitive search
      filterConditions.$or = [
        { title: searchRegex },
        { slug: searchRegex },
        { description: searchRegex },
        { keywordSearch: searchRegex },
      ];
    }

    return filterConditions;
  }

  private async generateDeeplinkForContent(
    content: Contents,
  ): Promise<ContentDataDto | null> {
    try {
      const dialect = content.dialect;
      const language = content.language;

      let episodeId: number;
      let showId: number;
      let seasonId: number;
      let contentType: DeeplinkContentType;
      let countEpisodes: number;

      switch (content.contentType) {
        case ContentTypeV2.MOVIE: {
          const episode = await this.episodesRepository.findOne(
            {
              displayLanguage: language,
              slug: content.slug,
            },
            ['_id', 'showId', 'seasonId', 'order'],
            {
              sort: { order: 1 },
            },
          );

          if (!episode) {
            throw Errors.EPISODE.NOT_FOUND(
              `Episode not found for movie ${content.slug}`,
            );
          }
          episodeId = episode._id;
          showId = content.contentId;
          seasonId = 0;
          contentType = DeeplinkContentType.MOVIE;
          countEpisodes = 1;
          break;
        }
        case ContentTypeV2.SHOW: {
          // For shows and microdramas, query episodes collection
          const firstEpisode = await this.episodesRepository.findOne(
            {
              displayLanguage: language,
              showSlug: content.slug,
              status: {
                $in: [EpisodeStatus.ACTIVE, EpisodeStatus.PREVIEW_PUBLISHED],
              },
            },
            ['_id', 'showId', 'seasonId', 'order'],
            {
              sort: { order: 1 },
            },
          );

          if (!firstEpisode) {
            return null;
          }

          episodeId = firstEpisode._id;
          showId = firstEpisode.showId;
          seasonId = firstEpisode.seasonId;
          countEpisodes = content.episodeCount || 0;

          contentType =
            content.format === ContentFormat.MICRO_DRAMA
              ? DeeplinkContentType.MICRO_DRAMA
              : DeeplinkContentType.SHOW;
          break;
        }
        default: {
          const _exhaustiveCheck: never = content.contentType;
          throw new Error(`Unhandled content type: ${_exhaustiveCheck}`);
        }
      }

      // Generate deeplinks based on content type
      const { contentWebLink, googleAppLink, metaAppLink, webPaywallLink } =
        this.generateDeeplinks(
          contentType,
          dialect,
          language,
          episodeId,
          showId,
          seasonId,
          content.title,
          content.slug,
        );

      return {
        contentDialect: content.dialect,
        contentSlug: content.slug,
        contentStatus: content.status,
        contentType,
        contentWebLink,
        countEpisodes,
        deeplinkContentType: contentType,
        dialect: content.dialect,
        displayLanguage: language,
        episodeId,
        firebaseMainAppLink: metaAppLink, // Using meta link as firebase link
        googleAppLink,
        metaAppLink,
        showId,
        showSlug: content.slug,
        title: content.title,
        webPaywallLink,
      };
    } catch (error) {
      console.error(
        `Error generating deeplink for content ${content.slug}:`,
        error,
      );
      return null;
    }
  }

  private generateDeeplinks(
    contentType: DeeplinkContentType,
    dialect: Dialect,
    language: Lang,
    episodeId: number,
    showId: number,
    seasonId: number,
    contentName: string,
    slug: string,
  ): IDeeplinks {
    switch (contentType) {
      case DeeplinkContentType.MOVIE:
        return generateMovieDeeplinks(
          dialect,
          language,
          episodeId,
          contentName,
          slug,
        );
      case DeeplinkContentType.SHOW:
        return generateShowDeeplinks(
          dialect,
          language,
          showId,
          seasonId,
          episodeId,
          contentName,
          slug,
        );
      case DeeplinkContentType.MICRO_DRAMA:
        return generateMicroDramaDeeplinks(
          dialect,
          language,
          showId,
          contentName,
          slug,
        );
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async searchHindiContent(
    filterConditions: FilterQuery<Contents>,
    perPage: number,
    offset: number,
  ): Promise<{ activeContents: Contents[]; totalCount: number }> {
    // When searching in Hindi, search English content with English query but return Hindi documents
    const englishFilterConditions: FilterQuery<Contents> = Object.assign(
      {},
      filterConditions,
      {
        language: Lang.EN,
      },
    );

    // First, find English content that matches the search and get total count
    const [englishContents, totalCount] = await Promise.all([
      this.contentRepository.find(englishFilterConditions, {
        limit: perPage,
        offset: offset,
        orderBy: [{ contentId: 'DESC' }],
      }),
      this.contentRepository.count(englishFilterConditions),
    ]);

    // Get the slugs of English content to find corresponding Hindi content
    const englishSlugs = englishContents.map((content) => content.slug);

    // Find corresponding Hindi content by slugs
    const hindiFilterConditions: FilterQuery<Contents> = {
      language: Lang.HIN,
      slug: { $in: englishSlugs },
      status: { $in: [ContentStatus.ACTIVE, ContentStatus.PREVIEW_PUBLISHED] },
    };

    // Add other filters
    const conditions = filterConditions as ContentFilterConditions;
    if (conditions.dialect) {
      hindiFilterConditions.dialect = conditions.dialect;
    }
    if (conditions.contentType) {
      hindiFilterConditions.contentType = conditions.contentType;
    }
    if (conditions.format) {
      hindiFilterConditions.format = conditions.format;
    }

    // Get Hindi content ordered by contentId to match English ordering
    const activeContents = await this.contentRepository.find(
      hindiFilterConditions,
      {
        orderBy: [{ contentId: 'DESC' }],
      },
    );

    return { activeContents, totalCount };
  }

  private async searchNormalContent(
    filterConditions: FilterQuery<Contents>,
    perPage: number,
    offset: number,
  ): Promise<{ activeContents: Contents[]; totalCount: number }> {
    const [activeContents, totalCount] = await Promise.all([
      this.contentRepository.find(filterConditions, {
        limit: perPage,
        offset: offset,
        orderBy: [{ contentId: 'DESC' }],
      }),
      this.contentRepository.count(filterConditions),
    ]);

    return { activeContents, totalCount };
  }

  async getAllDeelinks(
    query: GetDeeplinksRequestDto = {},
  ): Promise<GetDeeplinksResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.max(1, Math.min(100, Number(query.perPage) || 10));
    const offset = (page - 1) * perPage;

    const filterConditions = this.buildFilterConditions(query);

    let activeContents: Contents[];
    let totalCount: number;

    if (query.lang === Lang.HIN) {
      const result = await this.searchHindiContent(
        filterConditions,
        perPage,
        offset,
      );
      activeContents = result.activeContents;
      totalCount = result.totalCount;
    } else {
      const result = await this.searchNormalContent(
        filterConditions,
        perPage,
        offset,
      );
      activeContents = result.activeContents;
      totalCount = result.totalCount;
    }

    const deeplinks: ContentDataDto[] = [];

    for (const content of activeContents) {
      const deeplink = await this.generateDeeplinkForContent(content);
      if (deeplink) {
        deeplinks.push(deeplink);
      }
    }

    const totalPages = Math.ceil(totalCount / perPage);
    const nextPageAvailable = page < totalPages;

    return {
      data: deeplinks,
      nextPageAvailable,
      page,
      perPage,
      totalPages,
    };
  }
}
