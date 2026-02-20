import {
  EntityManager,
  EntityRepository,
  FindOptions,
  FilterQuery,
  wrap,
} from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { Lang } from '@app/common/enums/app.enum';

import { ContentTypeV2 } from '@app/common/enums/common.enums';

import { SortByEnum, SortOrderEnum } from '../dtos';
import {
  CreateDraftShowPayload,
  CreateDraftMoviePayload,
  IContent,
} from '../interfaces/content.interface';
import {
  ComplianceRating,
  Contents,
  ContentStatus,
  MediaAccessTier,
  PeripheralTypeEnum,
  ContentFormat,
} from 'common/entities/contents.entity';
import { Dialect } from 'common/enums/app.enum';
import { PeripheralMediaType } from 'common/enums/media.enum';

@Injectable()
export class ContentRepository extends EntityRepository<Contents> {
  constructor(readonly em: EntityManager) {
    super(em, Contents);
  }

  private async generateContentId(): Promise<number> {
    const latestContent = await this.findOne(
      { contentId: { $exists: true } },
      { orderBy: { contentId: 'desc' } },
    );
    const nextContentId =
      latestContent && latestContent.contentId
        ? latestContent.contentId + 1
        : 1;
    return nextContentId;
  }

  private getEmptyPeripheral(payload: IContent, type: PeripheralTypeEnum) {
    return {
      description: '',
      duration: 0,
      hlsSourceLink: '',
      mediaType: payload.trailer?.mediaType ?? PeripheralMediaType.TRAILER,
      rawMediaId: '',
      sourceLink: '',
      thumbnail: {
        horizontal: {
          sourceLink: payload.trailer?.thumbnail.horizontal.sourceLink ?? '',
        },
        square: {
          sourceLink: payload.trailer?.thumbnail.square.sourceLink ?? '',
        },
        vertical: {
          sourceLink: payload.trailer?.thumbnail.vertical.sourceLink ?? '',
        },
      },
      title: payload.trailer?.title ?? '',
      type,
      viewCount: 0,
      visionularHls: {
        hlsSourcelink: '',
        rawMediaId: '',
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      },
      visionularHlsH265: {
        hlsSourcelink: '',
        rawMediaId: '',
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      },
    };
  }
  async createDraftMovie(payload: CreateDraftMoviePayload) {
    const contentIdEnglish = await this.generateContentId();
    const contentIdHindi = contentIdEnglish + 1;

    const enMovieMeta = payload.meta[Lang.EN];
    const hinMovieMeta = payload.meta[Lang.HIN];

    const MOVIE_COMMON_PROPERTIES = {
      artistList: [],
      categoryList: [],
      complianceList: payload.complianceList,
      complianceRating: payload.complianceRating,
      consumptionRateCount: 0,
      contentType: ContentTypeV2.MOVIE,
      contributionField: '',
      createdBy: payload.userName,
      defaultThumbnailIndex: payload.defaultThumbnailIndex ?? 0,
      dialect: payload.dialect,
      duration: payload.duration,
      endDate: payload.endDate,
      episodeCount: 1, // Movies always have one episode
      isExclusive: false,
      isExclusiveOrder: 0,
      isNewContent: true,
      isPopularContent: false,
      isPremium: true,
      isScheduled: false,
      keywordSearch: '',
      label: enMovieMeta.label || '',
      mediaAccessTier: MediaAccessTier.SUBSCRIPTION,
      plotKeywords: payload.plotKeywords,
      primaryDialect: payload.primaryDialect,
      publishCount: 0,
      releaseDate: payload.releaseDate,
      seasonCount: 0,
      sourcedFrom: 0,
      startDate: new Date(),
      status: ContentStatus.DRAFT,
      targetAudience: payload.targetAudience,
      thumbnail: {
        horizontal: {
          ratio_16_9: {
            gradient: '',
            sourceLink: '',
          },
          ratio_7_2: {
            gradient: '',
            sourceLink: '',
          },
          ratio_tv: {
            gradient: '',
            sourceLink: '',
          },
        },
        square: {
          ratio_1_1: {
            gradient: '',
            sourceLink: '',
          },
        },
        vertical: {
          ratio_2_3: {
            gradient: '',
            sourceLink: '',
          },
        },
      },
      upcomingScheduleText: enMovieMeta.upcomingScheduleText || '',
      updatedBy: payload.userName,
    };

    const newHindiMovie = this.create({
      ...MOVIE_COMMON_PROPERTIES,
      allThumbnails: [],
      artistList: hinMovieMeta.artists,
      contentId: contentIdHindi,
      defaultThumbnailIndex: payload.defaultThumbnailIndex ?? 0,
      description: hinMovieMeta.description,
      descriptorTags: hinMovieMeta.descriptorTags,
      format: ContentFormat.STANDARD,
      genres: hinMovieMeta.genres,
      gradients: payload.gradients,
      isComingSoon: false,
      language: Lang.HIN,
      mediaList: [
        {
          ...this.getEmptyPeripheral(
            hinMovieMeta,
            PeripheralTypeEnum.EPISODE_PERIPHERAL,
          ),
          rawMediaId: hinMovieMeta.trailer?.rawMediaId || '',
          selectedPeripheralStatus: true,
          sourceLink: '',
          subtitle: { en: '', hin: '' },
          visionularHlsH265History: [],
          visionularHlsHistory: [],
        },
      ],
      metaDescription: hinMovieMeta.description,
      moods: hinMovieMeta.moods,
      oldContentId: contentIdHindi,
      plotKeywords: payload.plotKeywords,
      primaryDialect: MOVIE_COMMON_PROPERTIES.primaryDialect,
      releaseDate: MOVIE_COMMON_PROPERTIES.releaseDate,
      selectedPeripheral: this.getEmptyPeripheral(
        hinMovieMeta,
        PeripheralTypeEnum.EPISODE_PERIPHERAL,
      ),
      slug: payload.slug,
      subGenres: hinMovieMeta.subGenres,
      themes: hinMovieMeta.themes,
      thumbnail: {
        horizontal: {
          ratio_16_9: {
            gradient: '',
            sourceLink: '',
          },
          ratio_7_2: {
            gradient: '',
            sourceLink: '',
          },
          ratio_tv: {
            gradient: '',
            sourceLink: '',
          },
        },
        square: {
          ratio_1_1: {
            gradient: '',
            sourceLink: '',
          },
        },
        vertical: {
          ratio_2_3: {
            gradient: '',
            sourceLink: '',
          },
        },
      },
      title: hinMovieMeta.title,
      videoFormatDetail: [],
    });

    const newEnglishMovie = this.create({
      ...MOVIE_COMMON_PROPERTIES,
      allThumbnails: [],
      artistList: enMovieMeta.artists,
      contentId: contentIdEnglish,
      description: enMovieMeta.description,
      descriptorTags: enMovieMeta.descriptorTags,
      format: ContentFormat.STANDARD,
      genres: enMovieMeta.genres,
      gradients: payload.gradients,
      isComingSoon: false,
      language: Lang.EN,
      mediaList: [],
      metaDescription: enMovieMeta.description,
      moods: enMovieMeta.moods,
      oldContentId: contentIdEnglish,

      plotKeywords: payload.plotKeywords,
      selectedPeripheral: this.getEmptyPeripheral(
        enMovieMeta,
        PeripheralTypeEnum.EPISODE_PERIPHERAL,
      ),
      slug: payload.slug,
      subGenres: enMovieMeta.subGenres,
      themes: enMovieMeta.themes,
      title: enMovieMeta.title,
      videoFormatDetail: [],
    });

    await this.save(newHindiMovie);
    await this.save(newEnglishMovie);

    return {
      englishMovie: newEnglishMovie,
      hindiMovie: newHindiMovie,
    };
  }

  async createDraftShow(payload: CreateDraftShowPayload) {
    const contentIdEnglish = await this.generateContentId();
    const contentIdHindi = contentIdEnglish + 1;

    const enShowMeta = payload.meta[Lang.EN];
    const hinShowMeta = payload.meta[Lang.HIN];

    const SHOW_COMMON_PROPERTIES = {
      artistList: [],
      categoryList: [],
      complianceList: payload.complianceList,
      complianceRating: ComplianceRating.U,
      consumptionRateCount: 0,
      contentType: ContentTypeV2.SHOW,
      contributionField: '',
      createdBy: payload.userName,
      defaultThumbnailIndex: payload.defaultThumbnailIndex ?? 0,
      dialect: payload.dialect,
      duration: 0,
      endDate: new Date(),
      episodeCount: payload.episodeCount,
      isExclusive: false,
      isExclusiveOrder: 0,
      isNewContent: true,
      isPopularContent: false,
      isPremium: true,
      isScheduled: false,
      keywordSearch: '',
      label: '',
      mediaAccessTier: MediaAccessTier.SUBSCRIPTION,
      plotKeywords: payload.plotKeywords,
      primaryDialect: payload.primaryDialect,
      releaseDate: payload.releaseDate,
      seasonCount: payload.seasonCount,
      sourcedFrom: 0,
      startDate: new Date(),
      status: ContentStatus.DRAFT,
      targetAudience: payload.targetAudience,
      thumbnail: {
        horizontal: {
          ratio_16_9: {
            gradient: '',
            sourceLink: '',
          },
          ratio_7_2: {
            gradient: '',
            sourceLink: '',
          },
          ratio_tv: {
            gradient: '',
            sourceLink: '',
          },
        },
        square: {
          ratio_1_1: {
            gradient: '',
            sourceLink: '',
          },
        },
        vertical: {
          ratio_2_3: {
            gradient: '',
            sourceLink: '',
          },
        },
      },
      updatedBy: payload.userName,
    };
    const newHindiShow = this.create({
      ...SHOW_COMMON_PROPERTIES,
      allThumbnails: [],
      artistList: hinShowMeta.artists,
      contentId: contentIdHindi,
      description: hinShowMeta.description,
      descriptorTags: hinShowMeta.descriptorTags,
      format: payload.format,
      genres: hinShowMeta.genres,
      gradients: payload.gradients,
      isComingSoon: false,
      language: Lang.HIN,
      mediaList: [
        {
          ...this.getEmptyPeripheral(
            hinShowMeta,
            PeripheralTypeEnum.SHOW_PERIPHERAL,
          ),
          rawMediaId: hinShowMeta.trailer?.rawMediaId || '',
          selectedPeripheralStatus: true,
          sourceLink: '',
          subtitle: { en: '', hin: '' },
          visionularHlsH265History: [],
          visionularHlsHistory: [],
        },
      ],
      metaDescription: hinShowMeta.description,
      moods: hinShowMeta.moods,
      oldContentId: contentIdHindi,
      plotKeywords: payload.plotKeywords,
      primaryDialect: SHOW_COMMON_PROPERTIES.primaryDialect,
      publishCount: 0,
      releaseDate: SHOW_COMMON_PROPERTIES.releaseDate,
      seasonCount: SHOW_COMMON_PROPERTIES.seasonCount,
      selectedPeripheral: this.getEmptyPeripheral(
        hinShowMeta,
        PeripheralTypeEnum.SHOW_PERIPHERAL,
      ),
      slug: payload.slug,
      subGenres: hinShowMeta.subGenres,
      themes: hinShowMeta.themes,
      title: hinShowMeta.title,
      videoFormatDetail: [],
    });

    const newEnglishShow = this.create({
      ...SHOW_COMMON_PROPERTIES,
      allThumbnails: [],
      artistList: enShowMeta.artists,
      contentId: contentIdEnglish,
      description: enShowMeta.description,
      descriptorTags: enShowMeta.descriptorTags,
      format: payload.format,
      genres: enShowMeta.genres,
      gradients: payload.gradients,
      isComingSoon: false,
      language: Lang.EN,
      mediaList: [
        {
          ...this.getEmptyPeripheral(
            enShowMeta,
            PeripheralTypeEnum.SHOW_PERIPHERAL,
          ),
          rawMediaId: enShowMeta.trailer?.rawMediaId || '',
          selectedPeripheralStatus: true,
          sourceLink: '',
          subtitle: { en: '', hin: '' },
          visionularHlsH265History: [], // Add missing property
          visionularHlsHistory: [],
        },
      ],
      metaDescription: enShowMeta.description,
      moods: enShowMeta.moods,
      oldContentId: contentIdEnglish,
      plotKeywords: payload.plotKeywords,
      primaryDialect: SHOW_COMMON_PROPERTIES.primaryDialect,
      publishCount: 0,
      selectedPeripheral: this.getEmptyPeripheral(
        enShowMeta,
        PeripheralTypeEnum.SHOW_PERIPHERAL,
      ),
      slug: payload.slug,
      subGenres: enShowMeta.subGenres,

      themes: enShowMeta.themes,
      title: enShowMeta.title,
      videoFormatDetail: [],
    });

    await this.save(newHindiShow);
    await this.save(newEnglishShow);

    return {
      englishShow: newEnglishShow,
      hindiShow: newHindiShow,
    };
  }

  async findMovieBySlug(
    slug: string,
    dialect: Dialect,
  ): Promise<{
    englishMovie: Contents;
    hindiMovie: Contents;
  }> {
    const [englishMovie, hindiMovie] = await Promise.all([
      this.findOne({ dialect, language: Lang.EN, slug }, { populate: ['*'] }),
      this.findOne({ dialect, language: Lang.HIN, slug }, { populate: ['*'] }),
    ]);

    if (!englishMovie || !hindiMovie) {
      throw new Error('Movie not found');
    }

    return { englishMovie, hindiMovie };
  }

  async findPaginated(
    where: FilterQuery<Contents>,
    options?: FindOptions<Contents> & {
      sortBy?: SortByEnum;
      sortOrder?: SortOrderEnum;
    },
  ): Promise<{ items: Contents[]; total: number }> {
    const [items, total] = await Promise.all([
      this.find(where, {
        ...options,
        orderBy: {
          [options?.sortBy ?? SortByEnum.CONTENT_ID]:
            options?.sortOrder ?? SortOrderEnum.DESC,
        },
        populate: ['*'],
      }),
      this.count(where),
    ]);

    return { items, total };
  }

  async save(content: Contents) {
    await this.em.persistAndFlush(content);
    return content;
  }

  async updateMovie({
    language,
    payload,
    slug,
  }: {
    slug: string;
    payload: Partial<Contents>;
    language: Lang;
  }): Promise<Contents> {
    const movie = await this.findOneOrFail({ language, slug });
    if (!movie) {
      throw new Error('Movie not found');
    }

    wrap(movie).assign(payload, { em: this.em, merge: true });
    await this.save(movie);
    const updatedMovie = await this.findOneOrFail({ language, slug });
    console.log(JSON.stringify(updatedMovie.toObject(), null, 2));
    return updatedMovie;
  }
}
