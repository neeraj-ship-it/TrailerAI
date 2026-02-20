import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Inject, Injectable } from '@nestjs/common';

import { Lang } from '@app/common/enums/app.enum';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';
import { Contents, MediaItem } from 'common/entities/contents.entity';
import {
  AllShowThumbnails,
  Show,
  ShowStatus,
  ShowThumbnail,
} from 'common/entities/show-v2.entity';

@Injectable()
export class ShowRepository extends EntityRepository<Show> {
  constructor(
    readonly em: EntityManager,
    @Inject(ErrorHandlerService)
    private errorHandlerService: ErrorHandlerService,
  ) {
    super(em, Show);
  }
  async createShow({
    englishShow,
    enMediaList,
    enTransformedThumbnails,
    hindiShow,
    hinMediaList,
    hinTransformedThumbnails,
  }: {
    englishShow: Contents;
    hindiShow: Contents;
    enTransformedThumbnails: ShowThumbnail[];
    hinTransformedThumbnails: ShowThumbnail[];
    enMediaList: MediaItem[];
    hinMediaList: MediaItem[];
  }) {
    const SHOW_COMMON_PROPERTIES = {
      activity: {
        action: 'updated',
        roleId: 1,
        updatedAt: new Date(),
        writerName: englishShow.createdBy || '',
      },
      createdBy: englishShow.createdBy,
      crossTrailer: '',
      description: '',
      englishValidated: false,
      episodeCount: 0,
      format: englishShow.format,
      hindiValidated: false,
      likeConsumptionRatio: 0,
      likeCount: 0,
      metaDescription: '',
      metaKeyword: '',
      metasTags: [],
      order: 0,
      plotKeywords: [],
      premiumNessOrder: 0,
      publishCount: 0,
      randomOrder: 0,
      releaseDate: '',
      seasonCount: englishShow.seasonCount || 0,
      sourceLink: '',
      startDate: new Date(),
      status: ShowStatus.DRAFT,
      tags: '',
      viewCount: 0,
    };

    // Define an interface matching the structure of the incoming thumbnail data (from Contents entity)

    const newHindiShow = this.create({
      _id: hindiShow.contentId,
      activity: SHOW_COMMON_PROPERTIES.activity,
      allThumbnails: [
        {
          id: 1,
          ...hinTransformedThumbnails[0],
        },
      ],
      artistList: hindiShow.artistList.map((a, index) => ({
        callingName: '',
        characterName: a.character.hin,
        city: '',
        display: '',
        firstName: a.name.hin,
        gender: '',
        id: index,
        lastName: a.name.en,
        name: a.name.hin,
        order: index,
        profilePic: '',
        slug: a.slug,
        status: a.status,
      })),
      categoryList: hindiShow.categoryList,
      complianceList: hindiShow.complianceList,
      complianceRating: hindiShow.complianceRating,
      consumptionRateCount: hindiShow.consumptionRateCount,
      contributionField: hindiShow.contributionField,
      createdBy: SHOW_COMMON_PROPERTIES.createdBy,
      crossTrailer: '',
      defaultThumbnailIndex: hindiShow.defaultThumbnailIndex,
      description: hindiShow.description,
      descriptorTags: hindiShow.descriptorTags,
      displayLanguage: Lang.HIN,
      duration: hindiShow.duration,
      endDate: hindiShow.endDate,
      englishValidated: SHOW_COMMON_PROPERTIES.englishValidated,
      episodeCount: hindiShow.episodeCount,
      format: SHOW_COMMON_PROPERTIES.format,
      genreList: hindiShow.genres,
      gradients: hindiShow.gradients,
      hindiValidated: SHOW_COMMON_PROPERTIES.hindiValidated,
      isComingSoon: false,
      isExclusive: 0,
      isExclusiveOrder: hindiShow.isExclusiveOrder,
      isNewContent: hindiShow.isNewContent,
      isPopularContent: hindiShow.isPopularContent,
      isPremium: hindiShow.isPremium,
      isScheduled: hindiShow.isScheduled,
      keywordSearch: hindiShow.keywordSearch,
      label: hindiShow.label,
      language: hindiShow.dialect,
      likeConsumptionRatio: SHOW_COMMON_PROPERTIES.likeConsumptionRatio,
      likeCount: SHOW_COMMON_PROPERTIES.likeCount,
      mediaAccessTier: hindiShow.mediaAccessTier,
      mediaList: hinMediaList,
      metaDescription: hindiShow.description,
      metaKeyword: SHOW_COMMON_PROPERTIES.metaKeyword,
      metasTags: SHOW_COMMON_PROPERTIES.metasTags,
      metaTitle: hindiShow.title,
      mlTags: '',
      moods: hindiShow.moods,
      order: SHOW_COMMON_PROPERTIES.order,
      peripheralCount: hindiShow.mediaList.length,
      plotKeywords: hindiShow.plotKeywords,
      preContentWarningText:
        'तम्बाकू का सेवन स्वास्थ्य के लिए हानिकारक है। हम तम्बाकू सेवन का समर्थन नहीं करते हैं। तंबाकू छोड़ने के लिए, 1800 112356 (टोल फ्री) पर कॉल करें या 011-22901701 पर मिस्ड कॉल दें।',
      premiumNessOrder: SHOW_COMMON_PROPERTIES.premiumNessOrder,
      primaryDialect: hindiShow.primaryDialect,
      publishCount: SHOW_COMMON_PROPERTIES.publishCount,
      randomOrder: SHOW_COMMON_PROPERTIES.randomOrder,

      referenceShowArr: [],
      referenceShowIds: [],
      referenceShowSlugs: [],
      releaseDate: SHOW_COMMON_PROPERTIES.releaseDate,
      seasonCount: SHOW_COMMON_PROPERTIES.seasonCount,
      selectedPeripheral: hindiShow.selectedPeripheral,
      slug: hindiShow.slug,
      startDate: hindiShow.startDate,
      status: ShowStatus.DRAFT,
      subGenreList: hindiShow.subGenres,
      tags: SHOW_COMMON_PROPERTIES.tags,
      targetAudience: hindiShow.targetAudience,
      themes: hindiShow.themes,
      thumbnail: hinTransformedThumbnails[0], // Use the hardcoded version
      title: hindiShow.title,
      upcomingScheduleText: hindiShow.upcomingScheduleText || '',
      videoFormatDetail: hindiShow.videoFormatDetail,
      viewCount: SHOW_COMMON_PROPERTIES.viewCount,
    });

    const newEnglishShow = this.create({
      _id: englishShow.contentId,
      activity: SHOW_COMMON_PROPERTIES.activity,
      allThumbnails: [
        {
          id: 1,
          ...enTransformedThumbnails[0],
        },
      ],
      artistList: englishShow.artistList.map((a, index) => ({
        callingName: '',
        characterName: a.character.en,
        city: '',
        display: '',
        firstName: a.name.en,
        gender: '',
        id: index,
        lastName: a.name.hin,
        name: a.name.en,
        order: index,
        profilePic: '',
        slug: a.slug,
        status: a.status,
      })),
      categoryList: englishShow.categoryList,
      complianceList: englishShow.complianceList,
      complianceRating: englishShow.complianceRating,
      consumptionRateCount: englishShow.consumptionRateCount,
      contributionField: englishShow.contributionField,
      createdBy: SHOW_COMMON_PROPERTIES.createdBy,
      crossTrailer: SHOW_COMMON_PROPERTIES.crossTrailer,
      defaultThumbnailIndex: englishShow.defaultThumbnailIndex,
      description: englishShow.description,
      descriptorTags: englishShow.descriptorTags,
      displayLanguage: Lang.EN,
      duration: englishShow.duration,
      endDate: englishShow.endDate,
      englishValidated: SHOW_COMMON_PROPERTIES.englishValidated,
      episodeCount: englishShow.episodeCount,
      format: SHOW_COMMON_PROPERTIES.format,
      genreList: englishShow.genres,
      gradients: englishShow.gradients,
      hindiValidated: SHOW_COMMON_PROPERTIES.hindiValidated,
      isComingSoon: false,
      isExclusive: 0,
      isExclusiveOrder: englishShow.isExclusiveOrder,
      isNewContent: englishShow.isNewContent,
      isPopularContent: englishShow.isPopularContent,
      isPremium: englishShow.isPremium,
      isScheduled: englishShow.isScheduled,
      keywordSearch: englishShow.keywordSearch,
      label: englishShow.label,
      language: englishShow.dialect,
      likeConsumptionRatio: SHOW_COMMON_PROPERTIES.likeConsumptionRatio,
      likeCount: SHOW_COMMON_PROPERTIES.likeCount,
      mediaAccessTier: englishShow.mediaAccessTier,
      mediaList: enMediaList,
      metaDescription: englishShow.description,
      metaKeyword: SHOW_COMMON_PROPERTIES.metaKeyword,
      metasTags: SHOW_COMMON_PROPERTIES.metasTags,
      metaTitle: englishShow.title,
      mlTags: '',
      moods: englishShow.moods,
      order: SHOW_COMMON_PROPERTIES.order,
      peripheralCount: englishShow.mediaList.length,
      plotKeywords: englishShow.plotKeywords,
      preContentWarningText:
        'Tobacco consumption is injurious to health. We do not endorse tobacco consumption. To quit tobacco, Call 1800 112356 (Toll Free) or give a missed call at 011-22901701\n',
      premiumNessOrder: SHOW_COMMON_PROPERTIES.premiumNessOrder,
      primaryDialect: englishShow.primaryDialect,
      publishCount: SHOW_COMMON_PROPERTIES.publishCount,
      randomOrder: SHOW_COMMON_PROPERTIES.randomOrder,
      referenceShowArr: [],
      referenceShowIds: [],
      referenceShowSlugs: [],
      releaseDate: SHOW_COMMON_PROPERTIES.releaseDate,
      seasonCount: SHOW_COMMON_PROPERTIES.seasonCount,
      selectedPeripheral: englishShow.selectedPeripheral,
      slug: englishShow.slug,
      startDate: englishShow.startDate,
      status: ShowStatus.DRAFT,
      subGenreList: englishShow.subGenres,
      tags: SHOW_COMMON_PROPERTIES.tags,
      targetAudience: englishShow.targetAudience,
      themes: englishShow.themes,
      thumbnail: enTransformedThumbnails[0],
      title: englishShow.title,
      upcomingScheduleText: englishShow.upcomingScheduleText || '',
      videoFormatDetail: englishShow.videoFormatDetail,
      viewCount: SHOW_COMMON_PROPERTIES.viewCount,
    });

    await Promise.all([this.save(newHindiShow), this.save(newEnglishShow)]);

    return {
      englishShow: newEnglishShow,
      hindiShow: newHindiShow,
    };
  }

  async save(show: Show) {
    return this.em.persistAndFlush(show);
  }

  async updateShowFromContent(
    showId: number,
    content: Contents,
    episodeCount: number,
    transformedThumbnail: AllShowThumbnails[],
    // peripheralData: IContentMediaItem,
    mediaList: MediaItem[],
  ) {
    const show = await this.findOneOrFail({ _id: showId });

    // Just to make sure activity is not null and doesn't break the old cms
    show.activity = {
      action: 'updated',
      roleId: 1,
      updatedAt: new Date(),
      writerName: content.updatedBy || '',
    };
    const updatedMediaList = mediaList.map((media) => ({
      ...media,
      description: media.description,
      thumbnail: media.thumbnail,
      title: media.title,
    }));
    const selectedPeripheral =
      mediaList.find((media) => media.selectedPeripheralStatus === true) ??
      mediaList[0];

    show.targetAudience = content.targetAudience;
    show.primaryDialect = content.primaryDialect;
    show.artistList = content.artistList.map((a, index) => ({
      callingName: '',
      characterName: a.character.en,
      city: '',
      display: '',
      firstName: a.name.en,
      gender: '',
      id: index,
      lastName: a.name.hin,
      name: a.name.en,
      order: index,
      profilePic: '',
      slug: a.slug,
      status: a.status,
    }));

    show.categoryList = content.categoryList;
    show.complianceList = content.complianceList;
    show.complianceRating = content.complianceRating;
    show.consumptionRateCount = content.consumptionRateCount;
    show.defaultThumbnailIndex = content.defaultThumbnailIndex;
    show.description = content.description;
    show.descriptorTags = content.descriptorTags;
    show.duration = content.duration;
    show.endDate = content.endDate;
    show.episodeCount = content.episodeCount;
    show.genreList = content.genres;
    show.gradients = content.gradients;
    show.isPremium = content.isPremium;
    show.isScheduled = content.isScheduled;
    show.keywordSearch = content.keywordSearch;
    show.label = content.label;
    show.upcomingScheduleText = content.upcomingScheduleText || '';
    show.mediaAccessTier = content.mediaAccessTier;
    show.metaDescription = content.description;
    show.title = content.title;
    show.moods = content.moods;
    show.plotKeywords = content.plotKeywords;
    show.startDate = content.startDate;
    show.subGenreList = content.subGenres;
    show.themes = content.themes;
    show.episodeCount = episodeCount;
    show.allThumbnails = transformedThumbnail;
    show.thumbnail = transformedThumbnail[content.defaultThumbnailIndex];
    show.mediaList = updatedMediaList;
    show.selectedPeripheral = selectedPeripheral;
    show.mediaAccessTier = content.mediaAccessTier;
    show.peripheralCount = content.mediaList.length;
    show.seasonCount = content.seasonCount;

    return this.em.persistAndFlush(show);
  }
}
