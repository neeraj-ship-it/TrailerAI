import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import {
  SeasonThumbnailSet,
  Seasons,
  SeasonStatus,
} from '../entities/seasons.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ComplianceRating, Contents } from 'common/entities/contents.entity';

import { AllShowThumbnails } from '../../../common/entities/show-v2.entity';
import { SeasonDTO } from '../dtos/content.dto';
import { CreateDraftSeasonPayload } from '../interfaces/content.interface';

@Injectable()
export class SeasonRepository extends EntityRepository<Seasons> {
  constructor(readonly em: EntityManager) {
    super(em, Seasons);
  }

  private generateEmptyAllThumbnails(): SeasonThumbnailSet {
    return {
      horizontal: {
        ratio1: { gradient: '', sourceLink: '' },
        ratio2: { gradient: '', sourceLink: '' },
        ratio3: { gradient: '', sourceLink: '' },
      },
      square: {
        ratio1: { gradient: '', sourceLink: '' },
        ratio2: { gradient: '', sourceLink: '' },
        ratio3: { gradient: '', sourceLink: '' },
      },
      vertical: {
        ratio1: { gradient: '', sourceLink: '' },
        ratio2: { gradient: '', sourceLink: '' },
        ratio3: { gradient: '', sourceLink: '' },
      },
    };
  }

  private async generateSeasonContentId(): Promise<number> {
    const latestSeason = await this.findOne(
      { _id: { $exists: true } },
      { orderBy: { _id: 'desc' } },
    );
    return latestSeason && latestSeason._id ? latestSeason._id + 1 : 1;
  }

  async createDraftSeason({
    contentSlug,
    contributionField,
    dialect,
    endDate,
    episodeCount,
    gradients,
    meta,
    startDate,
  }: CreateDraftSeasonPayload) {
    const seasonIdEnglish = await this.generateSeasonContentId();
    const seasonIdHindi = seasonIdEnglish + 1;
    const { en, hin } = meta;
    const SEASON_COMMON_PROPERTIES = {
      complianceRating: ComplianceRating.U,
      contributionField,
      endDate,
      episodeCount,
      label: '',
      order: 1,
      slug: `${contentSlug}-s1`,
      startDate,
      status: SeasonStatus.DRAFT,
      viewCount: 0,
    };

    const newEnglishSeason = this.create({
      _id: seasonIdEnglish,
      allThumbnails: [{ id: 1, ...this.generateEmptyAllThumbnails() }],
      artistList: [],
      categoryList: en.categoryList,
      complianceRating: SEASON_COMMON_PROPERTIES.complianceRating,
      contributionField: SEASON_COMMON_PROPERTIES.contributionField,
      description: en.description || '',
      displayLanguage: Lang.EN,
      endDate: SEASON_COMMON_PROPERTIES.endDate,
      episodeCount: SEASON_COMMON_PROPERTIES.episodeCount,
      genreList: en.genres,
      gradients,
      isComingSoon: false,
      label: SEASON_COMMON_PROPERTIES.label,
      language: dialect,
      mediaList: [],
      order: SEASON_COMMON_PROPERTIES.order,
      selectedPeripheral: {
        id: 0,
        type: '',
        value: 0,
      },
      showId: en.showId,
      showSlug: contentSlug,
      slug: SEASON_COMMON_PROPERTIES.slug,
      startDate: SEASON_COMMON_PROPERTIES.startDate,
      status: SeasonStatus.ACTIVE,
      subGenreList: en.subGenres,
      tags: '',
      thumbnail: this.generateEmptyAllThumbnails(),
      title: en.title,
      viewCount: SEASON_COMMON_PROPERTIES.viewCount,
    });

    const newHindiSeason = this.create({
      _id: seasonIdHindi,
      allThumbnails: [{ id: 1, ...this.generateEmptyAllThumbnails() }],
      artistList: [],
      categoryList: hin.categoryList,
      complianceRating: SEASON_COMMON_PROPERTIES.complianceRating,
      contributionField: SEASON_COMMON_PROPERTIES.contributionField,
      description: hin.description || '',
      displayLanguage: Lang.HIN,
      endDate: SEASON_COMMON_PROPERTIES.endDate,
      episodeCount: SEASON_COMMON_PROPERTIES.episodeCount,
      genreList: hin.genres,
      gradients,
      isComingSoon: false,
      label: SEASON_COMMON_PROPERTIES.label,
      language: dialect,
      mediaList: [],
      order: SEASON_COMMON_PROPERTIES.order,
      selectedPeripheral: {
        id: 0,
        type: '',
        value: 0,
      },
      showId: hin.showId,
      showSlug: contentSlug,
      slug: SEASON_COMMON_PROPERTIES.slug,
      startDate: SEASON_COMMON_PROPERTIES.startDate,
      status: SeasonStatus.ACTIVE,
      subGenreList: hin.subGenres,
      tags: '',
      thumbnail: this.generateEmptyAllThumbnails(),
      title: hin.title,
      viewCount: SEASON_COMMON_PROPERTIES.viewCount,
    });

    await this.save(newEnglishSeason);
    await this.save(newHindiSeason);

    return { englishSeason: newEnglishSeason, hindiSeason: newHindiSeason };
  }

  async createSeasonPair({
    contentSlug,
    dialect,
    englishShow,
    enSeasonMeta,
    gradients,
    hindiShow,
    hinSeasonMeta,
  }: {
    contentSlug: string;
    englishShow: Contents;
    hindiShow: Contents;
    enSeasonMeta: SeasonDTO['meta']['en'];
    hinSeasonMeta: SeasonDTO['meta']['hin'];
    dialect: Dialect;
    gradients: string[];
  }) {
    const payload = {
      contentSlug,
      contributionField: englishShow._id.toString(),
      dialect,
      endDate: englishShow.endDate,
      episodeCount: 0, // Will be updated when episodes are added
      gradients,
      meta: {
        en: {
          categoryList: englishShow.categoryList,
          description: enSeasonMeta.description,
          genres: englishShow.genres,
          showId: englishShow.contentId,
          subGenres: englishShow.subGenres,
          title: enSeasonMeta.title,
        },
        hin: {
          categoryList: hindiShow.categoryList,
          description: hinSeasonMeta.description,
          genres: hindiShow.genres,
          showId: hindiShow.contentId,
          subGenres: hindiShow.subGenres,
          title: hinSeasonMeta.title,
        },
      },
      startDate: englishShow.startDate,
    };

    return this.createDraftSeason(payload);
  }

  async save(season: Seasons) {
    return this.em.persistAndFlush(season);
  }

  async updateSeason({
    allThumbnail,
    episodeCount,
    existingShow,
    gradients,
    seasonId,
    seasonMeta,
  }: {
    seasonId: number;
    seasonMeta: SeasonDTO['meta']['en'] | SeasonDTO['meta']['hin'];
    gradients: string[];
    episodeCount: number;
    allThumbnail: AllShowThumbnails[];
    existingShow: Contents;
  }) {
    const season = await this.findOneOrFail({
      _id: seasonId,
    });
    season.complianceRating = existingShow.complianceRating;
    season.genreList = existingShow.genres;
    season.subGenreList = existingShow.subGenres;
    season.title = seasonMeta.title;
    season.description = seasonMeta.description;
    season.gradients = gradients;
    season.episodeCount = episodeCount;
    // This is just to put default values for backward compatibility.
    if (!(season.allThumbnails?.length > 0)) {
      season.allThumbnails = allThumbnail;
    }
    season.allThumbnails = allThumbnail;
    // season.allThumbnails[0] = { id: 0, ...this.generateEmptyAllThumbnails() };
    season.thumbnail = allThumbnail[0] || this.generateEmptyAllThumbnails();

    await this.save(season);
    return season;
  }
}
