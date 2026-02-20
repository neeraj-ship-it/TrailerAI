import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { ContentType, ContentTypeV2 } from '@app/common/enums/common.enums';

import { RequiredEntityData, Transactional, wrap } from '@mikro-orm/core';

import { isBefore, subDays } from 'date-fns';

import { isValid } from 'date-fns/isValid';

import type {
  AddOrUpdateContentToComingSoon,
  UpcomingContentDetailsResponse,
} from '../dtos/content.dto';
import { TranscodingTaskStatusEnum } from '../entities/visionular-transcoding.entity';
import { ContentRepository } from '../repositories/content.repository';
import { EpisodeRepository } from '../repositories/episode.repository';
import { SeasonRepository } from '../repositories/season.repository';
import { ShowRepository } from '../repositories/show.repository';
import { UpcomingSectionRepository } from '../repositories/upcoming-section.repository';
import { Lang } from '@app/common/enums/app.enum';
import { Errors } from '@app/error-handler';
import {
  Contents,
  ContentStatus,
  EmbeddedShowPeripheral,
  MediaItem,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';
import { EmbeddedEpisodePeripheral } from 'common/entities/episode.entity';
import {
  ContentState,
  UpcomingSectionEntity,
  UpcomingSectionStatus,
} from 'common/entities/upcoming-section-v2.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';

@Injectable()
export class ComingSoonService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly upcomingSectionRepository: UpcomingSectionRepository,
    private readonly showRepository: ShowRepository,
    private readonly episodeRepository: EpisodeRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  private async getNextUpcomingSectionId() {
    const upcomingSection = await this.upcomingSectionRepository.find(
      {},
      {
        first: 1,
        orderBy: {
          _id: 'desc',
        },
      },
    );
    if (upcomingSection.length === 0) {
      return 1;
    }
    return upcomingSection[0]._id + 1;
  }

  private async getSelectedPeripheralForComingSoon(
    mediaList: MediaItem[],
    contentType: ContentTypeV2,
  ): Promise<EmbeddedShowPeripheral> {
    const comingSoonPeripheral = mediaList.find(
      (media) => media.mediaType === PeripheralMediaType.COMING_SOON,
    );
    if (!comingSoonPeripheral) {
      const defaultPeripheral = new MediaItem();
      defaultPeripheral.mediaType = PeripheralMediaType.COMING_SOON;
      defaultPeripheral.duration = 0;
      defaultPeripheral.type =
        contentType === ContentTypeV2.SHOW
          ? PeripheralTypeEnum.SHOW_PERIPHERAL
          : PeripheralTypeEnum.EPISODE_PERIPHERAL;
      defaultPeripheral.visionularHls = {
        hlsSourcelink: '',
        rawMediaId: '',
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      };
      defaultPeripheral.visionularHlsH265 = {
        hlsSourcelink: '',
        rawMediaId: '',
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      };
      return defaultPeripheral;
    }
    return comingSoonPeripheral;
  }

  private isEpisodePeripheral(
    peripheral: EmbeddedShowPeripheral,
  ): peripheral is EmbeddedEpisodePeripheral {
    return peripheral.type === PeripheralTypeEnum.EPISODE_PERIPHERAL;
  }

  private async transformIndividualEpisodeMetadataForUpcomingSection(
    episodeSlug: string,
    displayLanguage: Lang,
  ): Promise<RequiredEntityData<UpcomingSectionEntity, never, false>> {
    const episode = await this.episodeRepository.findOneOrFail({
      displayLanguage,
      slug: episodeSlug,
    });

    const selectedPeripheral = await this.getSelectedPeripheralForComingSoon(
      episode.mediaList,
      ContentTypeV2.MOVIE,
    );
    const isTrailerAvailable =
      selectedPeripheral.duration > 0 &&
      selectedPeripheral.visionularHls.status ===
        TranscodingTaskStatusEnum.SUCCEEDED;

    return {
      activity: episode.activity,
      artistList: episode.artistList,
      categoryList: episode.categoryList,
      contentId: episode._id,
      contentState: ContentState.COMING_SOON,
      contentType: ContentType.MOVIE,
      contributionField: episode.contributionField,
      description: episode.description,
      descriptorTags: episode.descriptorTags,
      displayLanguage: episode.displayLanguage,
      displayMedia: isTrailerAvailable ? 'media' : 'poster',
      duration: episode.duration,
      endDate:
        episode.endDate && isValid(new Date(episode.endDate))
          ? new Date(episode.endDate)
          : new Date(),
      englishValidated: episode.englishValidated,
      episodeCount: 0,
      format: episode.format,
      genreList: episode.genreList,
      gradients: episode.gradients,
      hindiValidated: episode.hindiValidated,
      isExclusive: episode.isExclusive,
      isExclusiveOrder: episode.isExclusiveOrder,
      isLived: false,
      isScheduled: false,
      label: episode.label ?? '',
      language: episode.language,
      likeCount: 0,
      mediaList: episode.mediaList,
      metaDescription: '',
      metaKeyword: '',
      metaTitle: '',
      moods: episode.moods,
      notApplicable: false,
      order: 0,
      peripheralCount: episode.mediaList.length,
      posterReleaseDate: subDays(new Date(), 1),
      publishCount: episode.publishCount,
      randomOrder: episode.randomOrder,
      referenceShowArr: [],
      referenceShowIds: [],
      referenceShowSlugs: [],
      releaseDate:
        episode.releaseDate && isValid(new Date(episode.releaseDate))
          ? new Date(episode.releaseDate)
          : null,
      seasonCount: 0,
      selectedPeripheral,
      slug: episode.slug,
      startDate: episode.startDate || null,
      status: UpcomingSectionStatus.DRAFT,
      subGenreList: episode.subGenreList,
      tags: episode.tags,
      themes: episode.themes,
      thumbnail: episode.thumbnail,
      title: episode.title,
      trailerReleaseDate: subDays(new Date(), 1),
      viewCount: episode.viewCount,
    };
  }

  private async transformShowMetadataForUpcomingSection(
    showSlug: string,
    displayLanguage: Lang,
  ): Promise<RequiredEntityData<UpcomingSectionEntity, never, false>> {
    const show = await this.showRepository.findOneOrFail({
      displayLanguage,
      slug: showSlug,
    });
    const season = await this.seasonRepository.findOneOrFail({
      displayLanguage,
      showSlug: showSlug,
    });
    const seasonId = season._id;
    const selectedPeripheral = await this.getSelectedPeripheralForComingSoon(
      show.mediaList,
      ContentTypeV2.SHOW,
    );
    const isTrailerAvailable =
      selectedPeripheral.duration > 0 &&
      selectedPeripheral.visionularHls.status === 'succeeded';
    return {
      activity: show.activity,
      artistList: show.artistList,
      categoryList: show.categoryList,
      contentId: show._id,
      contentState: ContentState.COMING_SOON,
      contentType: ContentType.SHOW,
      contributionField: show.contributionField,
      description: show.description,
      descriptorTags: show.descriptorTags,
      displayLanguage: show.displayLanguage,
      displayMedia: isTrailerAvailable ? 'media' : 'poster',
      duration: show.duration,
      endDate:
        show.endDate && isValid(new Date(show.endDate))
          ? new Date(show.endDate)
          : new Date(),
      englishValidated: show.englishValidated,
      episodeCount: show.episodeCount,
      format: show.format,
      genreList: show.genreList,
      gradients: show.gradients,
      hindiValidated: show.hindiValidated,
      isExclusive: show.isExclusive,
      isExclusiveOrder: show.isExclusiveOrder,
      isLived: false,
      isScheduled: show.isScheduled,
      label: show.label ?? '',
      language: show.language,
      likeCount: show.likeCount,
      mediaList: show.mediaList,
      metaDescription: show.metaDescription,
      metaKeyword: show.metaKeyword,
      metaTitle: show.metaTitle || '',
      moods: show.moods,
      notApplicable: false,
      order: 0,
      peripheralCount: show.peripheralCount,
      posterReleaseDate: subDays(new Date(), 1),
      publishCount: show.publishCount,
      randomOrder: show.randomOrder,
      referenceShowArr: show.referenceShowArr,
      referenceShowIds: show.referenceShowIds,
      referenceShowSlugs: show.referenceShowSlugs,
      releaseDate:
        show.releaseDate && isValid(new Date(show.releaseDate))
          ? new Date(show.releaseDate)
          : null,
      seasonCount: show.seasonCount,
      seasonId: seasonId,
      selectedPeripheral,
      slug: show.slug,
      startDate: show.startDate,
      status: UpcomingSectionStatus.DRAFT,
      subGenreList: show.subGenreList,
      tags: show.tags,
      themes: show.themes,
      thumbnail: show.thumbnail,
      title: show.title,
      trailerReleaseDate: subDays(new Date(), 1),
      viewCount: show.viewCount,
    };
  }

  private async updateContentAndRelatedEntities(
    slug: string,
    contentType: ContentTypeV2,
    isComingSoon: boolean,
  ): Promise<void> {
    const contents = await this.contentRepository.find({ contentType, slug });

    // Save contents sequentially
    for (const content of contents) {
      const selectedPeripheral = await this.getSelectedPeripheralForComingSoon(
        content.mediaList,
        contentType,
      );

      wrap(content).assign(
        {
          isComingSoon: isComingSoon ? true : false,
          selectedPeripheral,
        },
        { merge: true },
      );
      await this.contentRepository.save(content);
    }

    switch (contentType) {
      case ContentTypeV2.SHOW: {
        // Fetch sequentially to maintain transaction consistency
        const shows = await this.showRepository.find({ slug });
        const seasons = await this.seasonRepository.find({ showSlug: slug });

        // Save shows sequentially
        for (const show of shows) {
          const content = contents.find(
            (c) => c.language === show.displayLanguage,
          );
          if (!content) continue;

          const selectedPeripheral =
            await this.getSelectedPeripheralForComingSoon(
              content.mediaList,
              contentType,
            );

          wrap(show).assign(
            {
              isComingSoon: isComingSoon ? true : false,
              selectedPeripheral,
            },
            { merge: true },
          );
          await this.showRepository.save(show);
        }

        // Save seasons sequentially
        for (const season of seasons) {
          wrap(season).assign(
            { isComingSoon: isComingSoon ? true : false },
            { merge: true },
          );
          await this.seasonRepository.save(season);
        }

        break;
      }
      case ContentTypeV2.MOVIE: {
        const episodes = await this.episodeRepository.find({ slug });

        // Save episodes sequentially
        for (const episode of episodes) {
          const content = contents.find(
            (c) => c.language === episode.displayLanguage,
          );
          if (!content) continue;

          const selectedPeripheral =
            await this.getSelectedPeripheralForComingSoon(
              content.mediaList,
              contentType,
            );

          const episodePeripheral: EmbeddedEpisodePeripheral = {
            ...selectedPeripheral,
            type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
          };

          wrap(episode).assign(
            {
              isComingSoon: isComingSoon ? 1 : 0,
              selectedPeripheral: episodePeripheral,
            },
            { merge: true },
          );
          await this.episodeRepository.save(episode);
        }
        break;
      }
    }
  }

  private validateMediaListforComingSoon(mediaList: MediaItem[]) {
    const comingSoonIndex = mediaList.findIndex(
      (media) => media.mediaType === PeripheralMediaType.COMING_SOON,
    );
    if (comingSoonIndex === -1) {
      throw Errors.CMS.TRAILER_NOT_FOUND('Trailer not found');
    }

    if (!mediaList[comingSoonIndex].thumbnail.horizontal.sourceLink) {
      throw Errors.CMS.THUMBNAIL_NOT_FOUND('Trailer thumbnail is not found');
    }
  }

  @Transactional()
  async addOrUpdateContentToComingSoon({
    publishAt,
    slug,
  }: AddOrUpdateContentToComingSoon): Promise<UpcomingContentDetailsResponse> {
    // Parse and validate publishAt
    let releaseDate: string | null = null;
    if (publishAt !== null) {
      const date = new Date(publishAt);
      if (!isValid(date)) {
        throw new BadRequestException('Invalid publishAt date format');
      }
      releaseDate = date.toISOString();
    }

    // Fetch content for both languages sequentially to maintain transaction consistency
    const hindiContent = await this.contentRepository.findOneOrFail({
      language: Lang.HIN,
      slug,
    });
    const englishContent = await this.contentRepository.findOneOrFail({
      language: Lang.EN,
      slug,
    });

    // Validate both are in draft
    [hindiContent, englishContent].forEach((content) => {
      if (
        content.status !== ContentStatus.DRAFT &&
        content.status !== ContentStatus.PREVIEW_PUBLISHED &&
        content.status !== ContentStatus.COMING_SOON
      ) {
        throw new ConflictException(
          `Content (${content.language}) must be in draft status`,
        );
      }
      this.validateMediaListforComingSoon(content.mediaList);
    });

    // Helper to upsert upcoming section for a language
    const upsertUpcomingSection = async (
      content: Contents,
      displayLanguage: Lang,
    ) => {
      const existing = await this.upcomingSectionRepository.findOne({
        displayLanguage,
        slug,
      });

      const baseData = {
        ...(await (content.contentType === ContentTypeV2.SHOW
          ? this.transformShowMetadataForUpcomingSection(
              content.slug,
              displayLanguage,
            )
          : this.transformIndividualEpisodeMetadataForUpcomingSection(
              content.slug,
              displayLanguage,
            ))),
        displayLanguage,
        isLived: existing?.isLived ?? true,
        releaseDate,
        slug,
      };

      if (existing) {
        return this.upcomingSectionRepository.save(
          this.upcomingSectionRepository.assign(existing, baseData),
        );
      }
      return this.upcomingSectionRepository.save(
        this.upcomingSectionRepository.create(baseData),
      );
    };

    const hindiSection = await upsertUpcomingSection(hindiContent, Lang.HIN);
    const englishSection = await upsertUpcomingSection(englishContent, Lang.EN);

    // Return details (using Hindi as reference, or English if needed)
    const foundSection = hindiSection || englishSection;

    await this.updateContentAndRelatedEntities(
      slug,
      hindiContent.contentType,
      foundSection.isLived,
    );

    return {
      upcomingContentDetails: {
        isLived: foundSection.isLived,
        publishAt:
          foundSection.releaseDate instanceof Date
            ? foundSection.releaseDate.toISOString()
            : (foundSection.releaseDate ?? null),
      },
    };
  }
  async completeComingSoon(slug: string) {
    const upcomingContentDetails = await this.upcomingSectionRepository.find({
      slug,
    });
    if (upcomingContentDetails.length === 0) {
      return;
    }

    await Promise.all(
      upcomingContentDetails.map((content) =>
        this.upcomingSectionRepository.upsert({
          ...content,
          isLived: false,
          status: UpcomingSectionStatus.COMPLETED,
        }),
      ),
    );
  }
  async getComingSoonDetails(
    slug: string,
  ): Promise<UpcomingContentDetailsResponse> {
    const upcomingContentDetails = await this.upcomingSectionRepository.findOne(
      {
        slug,
      },
    );
    if (!upcomingContentDetails) {
      return {
        upcomingContentDetails: null,
      };
    }
    return {
      upcomingContentDetails: {
        isLived: upcomingContentDetails.isLived,
        publishAt:
          upcomingContentDetails.releaseDate instanceof Date
            ? upcomingContentDetails.releaseDate.toISOString()
            : null,
      },
    };
  }

  @Transactional()
  async toggleComingSoonStatus({ slug }: { slug: string }) {
    const upcomingContentDetails = await this.upcomingSectionRepository.find({
      slug,
    });
    const contentDetails = await this.contentRepository.findOneOrFail({
      slug,
    });

    if (contentDetails.status === ContentStatus.PUBLISH) {
      throw Errors.CMS.INVALID_CONTENT_STATUS(
        'Published content cannot be added to coming soon',
      );
    }
    if (upcomingContentDetails[0].releaseDate) {
      if (isBefore(upcomingContentDetails[0].releaseDate, new Date())) {
        throw Errors.CMS.INVALID_CONTENT_STATUS(
          'Publish date cannot be in the past',
        );
      }
    }

    const toggledStatus = !upcomingContentDetails[0].isLived;
    const newStatus = toggledStatus
      ? UpcomingSectionStatus.ACTIVE
      : UpcomingSectionStatus.DRAFT;

    for (const content of upcomingContentDetails) {
      await this.upcomingSectionRepository.upsert({
        ...content,
        isLived: toggledStatus,
        status: newStatus,
      });
    }

    await this.updateContentAndRelatedEntities(
      slug,
      contentDetails.contentType,
      toggledStatus,
    );
    const updatedSection = upcomingContentDetails[0];
    return {
      upcomingContentDetails: {
        isLived: toggledStatus,
        publishAt:
          updatedSection.releaseDate instanceof Date
            ? updatedSection.releaseDate.toISOString()
            : (updatedSection.releaseDate ?? null),
      },
    };
  }
}
