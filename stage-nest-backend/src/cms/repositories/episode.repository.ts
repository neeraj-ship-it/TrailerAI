import { EntityRepository, EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { EpisodeDTO, IMediaItem } from '../dtos/content.dto';
import { Seasons } from '../entities/seasons.entity';
import {
  CreateMoviePayload,
  DraftEpisodes,
  EpisodeGenreDto,
} from '../interfaces/content.interface';

import { updateSubtitleMetadataOnChanges } from '../utils/content.utils';
import {
  convertMetaTrailerToMediaList,
  convertThumbnailDTOToEpisodeThumbnail,
  getNextMediaItemId,
} from '../utils/thumbnail.utils';
import { hmsToSeconds } from '../utils/time.utils';
import {
  EmbeddableLegacyArtist,
  Show,
} from '@app/common/entities/show-v2.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { VideoResolution } from '@app/common/enums/media.enum';
import {
  ComplianceRating,
  ContentFormat,
  MediaAccessTier,
  MediaItem,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';
import {
  Episode,
  EpisodeStatus,
  Activity,
  GenreSchema,
  EpisodeType,
} from 'common/entities/episode.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';

@Injectable()
export class EpisodeRepository extends EntityRepository<Episode> {
  constructor(em: EntityManager) {
    super(em, Episode);
  }

  private calculateTimeSpanInSeconds({
    hours,
    minutes,
    seconds,
  }: {
    hours: number;
    minutes: number;
    seconds: number;
  }) {
    return hours * 3600 + minutes * 60 + seconds || undefined;
  }

  private async generateEpisodeId(): Promise<number> {
    const latestEpisode = await this.findOne(
      { _id: { $exists: true } },
      { orderBy: { _id: 'desc' } },
    );
    return latestEpisode && latestEpisode._id ? latestEpisode._id + 1 : 1;
  }

  private generateEpisodeSlug(
    episode: DraftEpisodes,
    episodeId: number,
  ): string {
    return episode.en.title.toLowerCase().replace(/ /g, '-') + '_' + episodeId;
  }

  private generateMicrodramaEpisodeSlug({
    episodeId,
    slug,
  }: {
    slug: string;
    episodeId: number;
  }): string {
    return slug + '_' + episodeId;
  }

  private preparePeripheralData(episode: DraftEpisodes) {
    return {
      description: '',
      duration: episode.duration,
      hlsSourceLink: '',
    };
  }

  private updateOrAddTrailerToMediaList(
    trailer: IMediaItem,
    existingMediaList: MediaItem[],
  ): MediaItem[] {
    const mediaList = existingMediaList || [];

    // Find existing teaser by ID if provided
    const existingTeaserIndex = trailer.id
      ? mediaList.findIndex(
          (item) =>
            item.id === trailer.id &&
            item.mediaType === PeripheralMediaType.TEASER,
        )
      : -1;

    const trailerMediaItem: Partial<MediaItem> = {
      description: trailer.description ?? '',
      id: trailer.id,
      mediaType: PeripheralMediaType.TEASER,
      rawMediaId: trailer.rawMediaId ?? '',
      selectedPeripheralStatus: trailer.selectedPeripheralStatus ?? false,
      sourceLink: trailer.sourceLink ?? '',
      thumbnail: {
        horizontal: {
          sourceLink: trailer.thumbnail.horizontal.sourceLink ?? '',
        },
        square: {
          sourceLink: trailer.thumbnail.square.sourceLink ?? '',
        },
        vertical: {
          sourceLink: trailer.thumbnail.vertical.sourceLink ?? '',
        },
      },
      title: trailer.title ?? '',
      type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
    };

    if (existingTeaserIndex >= 0 && trailer.id) {
      const existingTeaser = mediaList[existingTeaserIndex];
      mediaList[existingTeaserIndex] = convertMetaTrailerToMediaList({
        index: existingTeaser.id,
        originalTrailer: existingTeaser,
        updatedTrailer: trailerMediaItem,
      });
    } else {
      const newTeaserId = getNextMediaItemId(mediaList);
      const newTeaser = convertMetaTrailerToMediaList({
        index: newTeaserId,
        originalTrailer: new MediaItem(),
        updatedTrailer: {
          ...trailerMediaItem,
          id: newTeaserId,
        },
      });
      mediaList.push(newTeaser);
    }

    return mediaList;
  }

  async createDraftEpisodes({
    defaultThumbnailIndex,
    episodes,
    format,
    showSlug,
  }: {
    episodes: DraftEpisodes[];
    showSlug: string;
    format: ContentFormat;
    defaultThumbnailIndex: number;
  }) {
    const episodeEntities: Episode[] = [];
    let latestId = await this.generateEpisodeId();

    for (const episode of episodes) {
      const currentEpisodePosition = episodes.indexOf(episode);

      const enEpisodeId = latestId++;
      const hinEpisodeId = latestId++;

      const episodeSlug =
        format === ContentFormat.MICRO_DRAMA
          ? this.generateMicrodramaEpisodeSlug({
              episodeId: enEpisodeId,
              slug: showSlug,
            })
          : this.generateEpisodeSlug(episode, enEpisodeId);

      const activity = new Activity();
      activity.action = 'DRAFT';
      activity.updatedAt = new Date();
      activity.writerName = 'SYSTEM';

      const COMMON_EPISODE_DATA = {
        activity: activity,
        allThumbnails: [],
        artistList: [],
        caption: '',
        categoryList: [],
        collectionId: 0,
        collectionSlug: '',
        comingSoonDate: new Date(),
        complianceList: [],
        complianceRating: ComplianceRating.U,
        consumptionRateCount: 0,
        contributionField: '',
        defaultThumbnailIndex: defaultThumbnailIndex ?? 0,
        descriptorTags: [],
        endDate: new Date(),
        englishValidated: false,
        episodeOrder: episode.episodeOrder || currentEpisodePosition + 1,
        freeEpisode: false,
        freeEpisodeDuration: 0,
        gradients: [],
        hindiValidated: false,
        hlsSourceLink: '',
        introEndTime: this.calculateTimeSpanInSeconds(episode.introEndTime),
        introStartTime: this.calculateTimeSpanInSeconds(episode.introStartTime),
        isComingSoon: 0,
        isExclusive: 0,
        isExclusiveOrder: 0,
        isNewContent: false,
        isPopularContent: false,
        isPremium: true,
        label: '',
        likesCount: 0,
        location: '',
        mediaAccessTier: 0,
        mogiHLS: {
          hlsSourcelink: '',
          mogiId: '',
          status: '',
        },
        mood: '',
        moods: [],
        nextEpisodeNudgeStartTime: this.calculateTimeSpanInSeconds(
          episode.nextEpisodeNudgeStartTime,
        ),
        order: currentEpisodePosition + 1,
        parentDetail: {
          seasonTitle: '',
          slug: '',
          sourceLink: '',
          title: '',
        },
        peripheralList: [],
        promoDetails: {},
        publishDate: new Date(),
        randomOrder: 0,
        referenceShowIds: [],
        referenceShowSlugs: [],
        releaseDate: new Date(),
        showTitle: '',
        skipDisclaimer: false,
        slug: episodeSlug,
        sourceLink: '',
        startDate: new Date(),
        status: EpisodeStatus.DRAFT,
        syncJobStatus: '',
        syncStatus: '',
        tags: '',
        tg: '',
        theme: '',
        thumbnail: episode.hin.thumbnail,
        transcoderOutput: {},
        transitionList: [],
        type: EpisodeType.SEASON,
        uploadStatus: '',
        videoFormatDetail: [],
        videoProcessingStatus: '',
        videoResolution: VideoResolution.HD,
        videoSize: 0,
        videoUrl: '',
        viewCount: 0,
        visionularHls: {
          hlsSourcelink: '',
          mogiId: '',
          rawMediaId: episode.rawMediaId || '',
          sourceLink: '',
          status: '',
          visionularTaskId: '',
        },
        visionularHlsH265: {
          hlsSourcelink: '',
          mogiId: '',
          rawMediaId: episode.rawMediaId || '',
          sourceLink: '',
          status: '',
          visionularTaskId: '',
        },
        visionularHlsH265History: [],
        visionularHlsHistory: [],
      };

      const hindiEpisode = this.create({
        ...COMMON_EPISODE_DATA,
        _id: hinEpisodeId,
        defaultThumbnailIndex: defaultThumbnailIndex,
        description: episode.hin.description,
        displayLanguage: Lang.HIN,
        duration: episode.duration,
        format: format,
        genreList: episode.hin.genreList,
        language: episode.dialect,
        mediaList: [
          {
            description: '',
            duration: episode.duration,
            hlsSourceLink: '',
            id: 0,
            mediaType: PeripheralMediaType.TRAILER,
            rawMediaId: '',
            selectedPeripheralStatus: true,
            sourceLink: '',
            subtitle: { en: '', hin: '' },
            thumbnail: {
              horizontal: {
                sourceLink: '',
              },
              square: {
                sourceLink: '',
              },
              vertical: {
                sourceLink: '',
              },
            },
            title: '',
            type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
            visionularHlsH265History: [],
            visionularHlsHistory: [],
          },
        ],
        preContentWarningText:
          ' तम्बाकू का सेवन स्वास्थ्य के लिए हानिकारक है। हम तम्बाकू सेवन का समर्थन नहीं करते हैं। तंबाकू छोड़ने के लिए, 1800 112356 (टोल फ्री) पर कॉल करें या 011-22901701 पर मिस्ड कॉल दें।',
        publishCount: 0,
        seasonId: episode.hin.seasonId,
        seasonSlug: episode.seasonSlug,
        selectedPeripheral: {
          description: '',
          duration: episode.duration,
          hlsSourceLink: '',
          rawMediaId: episode.rawMediaId,
          sourceLink: '',
          thumbnail: {
            horizontal: {
              sourceLink: '',
            },
            square: {
              sourceLink: '',
            },
            vertical: {
              sourceLink: '',
            },
          },
          title: '',
          type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
          viewCount: 0,
          visionularHls: {
            hlsSourcelink: '',
            rawMediaId: episode.rawMediaId,
            sourceLink: '',
            status: '',
            visionularTaskId: '',
          },
          visionularHlsH265: {
            hlsSourcelink: '',
            rawMediaId: episode.rawMediaId,
            sourceLink: '',
            status: '',
            visionularTaskId: '',
          },
        },

        showId: episode.hin.showId,
        showSlug: episode.showSlug,
        subGenreList: episode.hin.subGenreList,
        subtitle: updateSubtitleMetadataOnChanges({
          currentSubtitle: episode.subtitle,
          localUpload: !!episode.subtitle?.hinMetadata,
          newEnFile: episode.subtitle?.en ?? '',
          newHinFile: episode.subtitle?.hin ?? '',
        }),
        themes: [],
        thumbnail: episode.hin.thumbnail,
        title: episode.hin.title,
        type: EpisodeType.SEASON,
      });

      const englishEpisode = this.create({
        ...COMMON_EPISODE_DATA,
        _id: enEpisodeId,
        defaultThumbnailIndex: defaultThumbnailIndex,
        description: episode.en.description,
        displayLanguage: Lang.EN,
        duration: episode.duration,
        format: format,
        genreList: episode.en.genreList,
        language: episode.dialect,
        mediaList: [
          {
            description: '',
            duration: episode.duration,
            hlsSourceLink: '',
            id: 0,
            mediaType: PeripheralMediaType.TRAILER,
            rawMediaId: '',
            selectedPeripheralStatus: true,
            sourceLink: '',
            subtitle: { en: '', hin: '' },
            thumbnail: {
              horizontal: {
                sourceLink: '',
              },
              square: {
                sourceLink: '',
              },
              vertical: {
                sourceLink: '',
              },
            },
            title: '',
            type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
            visionularHlsH265History: [],
            visionularHlsHistory: [],
          },
        ],
        preContentWarningText:
          'Tobacco consumption is injurious to health. We do not endorse tobacco consumption. To quit tobacco, Call 1800 112356 (Toll Free) or give a missed call at 011-22901701\n',
        publishCount: 0,
        seasonId: episode.en.seasonId,
        seasonSlug: episode.seasonSlug,
        selectedPeripheral: {
          description: '',
          duration: episode.duration,
          hlsSourceLink: '',
          rawMediaId: episode.rawMediaId,
          sourceLink: '',
          thumbnail: {
            horizontal: {
              sourceLink: '',
            },
            square: {
              sourceLink: '',
            },
            vertical: {
              sourceLink: '',
            },
          },
          title: '',
          type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
          viewCount: 0,
          visionularHls: {
            hlsSourcelink: '',
            rawMediaId: episode.rawMediaId,
            sourceLink: '',
            status: '',
            visionularTaskId: '',
          },
          visionularHlsH265: {
            hlsSourcelink: '',
            rawMediaId: episode.rawMediaId,
            sourceLink: '',
            status: '',
            visionularTaskId: '',
          },
        },
        showId: episode.en.showId,
        showSlug: episode.showSlug,
        subGenreList: episode.en.subGenreList,
        subtitle: updateSubtitleMetadataOnChanges({
          currentSubtitle: episode.subtitle,
          localUpload: !!episode.subtitle?.enMetadata,
          newEnFile: episode.subtitle?.en,
          newHinFile: episode.subtitle?.hin,
        }),
        themes: [],
        thumbnail: {
          horizontal: {
            ratio1: {
              gradient: episode.en.thumbnail.horizontal.ratio1.gradient,
              sourceLink: episode.en.thumbnail.horizontal.ratio1.sourceLink,
            },
            ratio2: {
              // This is here because app is not able to handle optional fields
              gradient: '',
              sourceLink: '',
            },
            ratio3: {
              // This is here because app is not able to handle optional fields
              gradient: '',
              sourceLink: '',
            },
          },
          square: {
            ratio1: {
              gradient: episode.en.thumbnail.square.ratio1.gradient,
              sourceLink: episode.en.thumbnail.square.ratio1.sourceLink,
            },
          },
          vertical: {
            ratio1: {
              gradient: episode.en.thumbnail.vertical.ratio1.gradient,
              sourceLink: episode.en.thumbnail.vertical.ratio1.sourceLink,
            },
          },
        },
        title: episode.en.title,
        type: EpisodeType.SEASON,
      });

      episodeEntities.push(hindiEpisode, englishEpisode);
    }

    await this.insertMany(episodeEntities);

    return {
      englishEpisodes: episodeEntities.filter(
        (episode) => episode.displayLanguage === Lang.EN,
      ),
      hindiEpisodes: episodeEntities.filter(
        (episode) => episode.displayLanguage === Lang.HIN,
      ),
    };
  }

  async createEpisodesFromSeasons({
    defaultThumbnailIndex,
    dialect,
    englishGenres,
    englishSeasonId,
    englishShowId,
    englishSubGenres,
    epData,
    episodeOrder,
    format = ContentFormat.STANDARD,
    hindiGenres,
    hindiSeasonId,
    hindiShowId,
    hindiSubGenres,
    hinEpData,
    seasonSlug,
    showSlug,
  }: {
    epData: EpisodeDTO;
    hinEpData: EpisodeDTO;
    englishSeasonId: number;
    hindiSeasonId: number;
    englishShowId: number;
    hindiShowId: number;
    englishGenres: GenreSchema[];
    hindiGenres: GenreSchema[];
    englishSubGenres: GenreSchema[];
    hindiSubGenres: GenreSchema[];
    seasonSlug: string;
    showSlug: string;
    dialect: Dialect;
    episodeOrder: number;
    format?: ContentFormat;
    defaultThumbnailIndex: number;
  }) {
    const episodePayload = {
      defaultThumbnailIndex: defaultThumbnailIndex ?? 0,
      dialect,
      duration: 0,
      en: {
        ...epData.meta.en,
        genreList: englishGenres,
        seasonId: englishSeasonId,
        showId: englishShowId,
        subGenreList: englishSubGenres,

        thumbnail: epData.meta.en.thumbnails,
      },
      episodeOrder: episodeOrder,
      hin: {
        ...hinEpData.meta.hin,
        genreList: hindiGenres,
        seasonId: hindiSeasonId,
        showId: hindiShowId,
        subGenreList: hindiSubGenres,
        thumbnail: hinEpData.meta.hin.thumbnails,
      },
      introEndTime: {
        hours: epData.introEnd.hours,
        minutes: epData.introEnd.minutes,
        seconds: epData.introEnd.seconds,
      },
      introStartTime: {
        hours: epData.introStart.hours,
        minutes: epData.introStart.minutes,
        seconds: epData.introStart.seconds,
      },
      nextEpisodeNudgeStartTime: {
        hours: epData.nextEpisodeNudge.hours,
        minutes: epData.nextEpisodeNudge.minutes,
        seconds: epData.nextEpisodeNudge.seconds,
      },
      order: epData.order,
      rawMediaId: epData.rawMediaId,
      seasonSlug: seasonSlug,
      showSlug: showSlug,
      subtitle: {
        en: epData.subtitle?.en ?? '',
        enMetadata: null,
        hin: epData.subtitle?.hin ?? '',
        hinMetadata: null,
      },
    };

    return this.createDraftEpisodes({
      defaultThumbnailIndex,
      episodes: [episodePayload],
      format,
      showSlug,
    });
  }

  async createMovie(payload: CreateMoviePayload): Promise<{
    englishMovieEpisode: Episode;
    hindiMovieEpisode: Episode;
  }> {
    const { duration, en, hin, introEndTime, introStartTime, slug } = payload;

    // Convert thumbnails using utility function
    const enThumbnail = convertThumbnailDTOToEpisodeThumbnail(en.thumbnails[0]);
    const hinThumbnail = convertThumbnailDTOToEpisodeThumbnail(
      hin.thumbnails[0],
    );

    const activity = new Activity();
    activity.action = 'DRAFT';
    activity.updatedAt = new Date();
    activity.writerName = payload.userName;
    activity.roleId = 1;

    const COMMON_EPISODE_DATA = {
      activity,
      artistList: [],
      caption: '',
      categoryList: [],
      collectionId: 0,
      collectionSlug: '',
      comingSoonDate: new Date(),
      complianceList: [],
      complianceRating: ComplianceRating.U,
      consumptionRateCount: 0,
      contributionField: '',
      createdAt: new Date(),
      createdBy: '',
      descriptorTags: [],
      displayLanguage: Lang.EN,
      endDate: new Date(),
      englishValidated: false,
      freeEpisode: false,
      freeEpisodeDuration: 0,
      genreList: [],
      gradients: [],
      hindiValidated: false,
      hlsSourceLink: '',
      isActive: true,
      isComingSoon: 0,
      isDeleted: false,
      isExclusive: 0,
      isExclusiveOrder: 0,
      isNewContent: false,
      isPopularContent: false,
      isPremium: true,
      keywordSearch: '',
      label: '',
      likesCount: 0,
      location: '',
      mediaAccessTier: MediaAccessTier.SUBSCRIPTION,
      mogiHLS: {
        hlsSourcelink: '',
        mogiId: '',
        status: '',
      },
      mood: '',
      moods: [],
      oldEpisodeId: 0,
      parentDetail: {
        seasonTitle: '',
        slug: '',
        sourceLink: '',
        title: '',
      },
      plotKeywords: [],
      preContentWarningText: '',
      primaryDialect: Dialect.HAR,
      randomOrder: 0,
      releaseDate: new Date(),
      seasonId: 0,
      seasonSlug: '',
      skipDisclaimer: false,
      startDate: new Date(),
      subGenreList: [],
      tags: '',
      targetAudience: '',
      tg: '',
      theme: '',
      themes: [],
      transitionList: [],
      type: EpisodeType.INDIVIDUAL,
      upcomingScheduleText: en.upcomingScheduleText || '',
      updatedAt: new Date(),
      updatedBy: '',
      uploadStatus: '',
      videoFormatDetail: [],
      videoProcessingStatus: '',
      videoResolution: VideoResolution.HD,
      videoSize: 0,
      videoUrl: '',
      viewCount: 0,
      visionularHls: {
        hlsSourcelink: '',
        rawMediaId: payload.rawMediaId,
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      },
      visionularHlsH265: {
        hlsSourcelink: '',
        rawMediaId: payload.rawMediaId,
        sourceLink: '',
        status: '',
        visionularTaskId: '',
      },
      visionularHlsH265History: [],
      visionularHlsHistory: [],
    };

    const hindiMovieId = await this.generateEpisodeId();
    const englishMovieId = hindiMovieId + 1;
    const englishEpisode = this.create({
      ...COMMON_EPISODE_DATA,
      _id: englishMovieId,
      allThumbnails: [enThumbnail],
      defaultThumbnailIndex: payload.defaultThumbnailIndex ?? 0,
      description: en.description,
      descriptorTags: en.descriptorTag,
      displayLanguage: Lang.EN,
      duration,
      episodeOrder: 1,
      format: ContentFormat.STANDARD,
      genreList: en.genreList,
      introEndTime: hmsToSeconds(introEndTime),
      introStartTime: hmsToSeconds(introStartTime),
      language: payload.dialect,
      mediaList: [
        {
          description: '',
          duration,
          hlsSourceLink: '',
          id: 0,
          mediaType: PeripheralMediaType.TRAILER,
          rawMediaId: '',
          selectedPeripheralStatus: true,
          sourceLink: '',
          subtitle: { en: '', hin: '' },
          thumbnail: {
            horizontal: {
              sourceLink: '',
            },
            square: {
              sourceLink: '',
            },
            vertical: {
              sourceLink: '',
            },
          },
          title: '',
          type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
          visionularHlsH265History: [],
          visionularHlsHistory: [],
        },
      ],
      moods: en.moods,
      nextEpisodeNudgeStartTime: hmsToSeconds({
        hours: 0,
        minutes: 0,
        seconds: 0,
      }),
      order: 1,
      publishCount: 0,
      selectedPeripheral: {
        description: '',
        duration,
        hlsSourceLink: '',
        rawMediaId: '',
        sourceLink: '',
        thumbnail: {
          horizontal: {
            sourceLink: '',
          },
          square: {
            sourceLink: '',
          },
          vertical: {
            sourceLink: '',
          },
        },
        title: '',
        type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
      },
      showId: 0,
      showSlug: '',
      slug: slug,
      sourceLink: '',
      status: EpisodeStatus.DRAFT,
      subGenreList: en.subGenreList,
      subtitle: {
        en: en.subtitle || '',
        hin: hin.subtitle || '',
      },
      themes: en.themes,
      thumbnail: enThumbnail,
      title: en.title,
      type: EpisodeType.INDIVIDUAL,
    });
    const hindiEpisode = this.create({
      ...COMMON_EPISODE_DATA,
      _id: hindiMovieId,
      allThumbnails: [hinThumbnail],
      defaultThumbnailIndex: payload.defaultThumbnailIndex ?? 0,
      description: hin.description,
      descriptorTags: hin.descriptorTag,
      displayLanguage: Lang.HIN,
      duration,
      episodeOrder: 1,
      format: ContentFormat.STANDARD,
      genreList: hin.genreList,
      introEndTime: hmsToSeconds(introEndTime),
      introStartTime: hmsToSeconds(introStartTime),
      language: payload.dialect,
      mediaList: [
        {
          description: '',
          duration,
          hlsSourceLink: '',
          id: 0,
          mediaType: PeripheralMediaType.TRAILER,
          rawMediaId: '',
          selectedPeripheralStatus: true,
          sourceLink: '',
          subtitle: { en: '', hin: '' },
          thumbnail: {
            horizontal: {
              sourceLink: '',
            },
            square: {
              sourceLink: '',
            },
            vertical: {
              sourceLink: '',
            },
          },
          title: '',
          type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
          visionularHlsH265History: [],
          visionularHlsHistory: [],
        },
      ],
      moods: hin.moods,
      nextEpisodeNudgeStartTime: hmsToSeconds({
        hours: 0,
        minutes: 0,
        seconds: 0,
      }),
      order: 1,
      publishCount: 0,
      selectedPeripheral: {
        description: '',
        duration: 0,
        hlsSourceLink: '',
        rawMediaId: '',
        sourceLink: '',
        thumbnail: {
          horizontal: {
            sourceLink: '',
          },
          square: {
            sourceLink: '',
          },
          vertical: {
            sourceLink: '',
          },
        },
        title: '',
        type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
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
      },
      showId: 0,
      showSlug: '',
      slug: slug,
      sourceLink: '',
      status: EpisodeStatus.DRAFT,
      subGenreList: hin.subGenreList,
      subtitle: {
        en: en.subtitle || '',
        hin: hin.subtitle || '',
      },
      themes: hin.themes,
      thumbnail: hinThumbnail,
      title: hin.title,
      type: EpisodeType.INDIVIDUAL,
    });

    await this.em.persistAndFlush([englishEpisode, hindiEpisode]);

    return {
      englishMovieEpisode: englishEpisode,
      hindiMovieEpisode: hindiEpisode,
    };
  }

  async deleteEpisodesNotInPayload({
    enEpisodeIds,
    enSeasonId,
    enShowId,
    hinEpisodeIds,
    hinSeasonId,
    hinShowId,
  }: {
    enShowId: number;
    hinShowId: number;
    enSeasonId: number;
    hinSeasonId: number;
    enEpisodeIds: number[];
    hinEpisodeIds: number[];
  }): Promise<void> {
    // Delete English episodes not in payload
    const enEpisodesToDelete = await this.find({
      _id: { $nin: enEpisodeIds },
      displayLanguage: Lang.EN,
      seasonId: enSeasonId,
      showId: enShowId,
    });

    // Delete Hindi episodes not in payload
    const hinEpisodesToDelete = await this.find({
      _id: { $nin: hinEpisodeIds },
      displayLanguage: Lang.HIN,
      seasonId: hinSeasonId,
      showId: hinShowId,
    });

    if (enEpisodesToDelete.length > 0) {
      await this.em.removeAndFlush(enEpisodesToDelete);
    }

    if (hinEpisodesToDelete.length > 0) {
      await this.em.removeAndFlush(hinEpisodesToDelete);
    }
  }

  async findEpisodesWithRawMediaStatus({
    episodeStatuses,
    rawMediaStatus,
    seasonId,
  }: {
    seasonId: number;
    rawMediaStatus: string;
    episodeStatuses?: EpisodeStatus[];
  }): Promise<Episode[]> {
    const matchConditions: Record<string, unknown> = {
      $or: [
        { 'visionularHls.rawMediaId': { $exists: true, $ne: '' } },
        { 'visionularHlsH265.rawMediaId': { $exists: true, $ne: '' } },
      ],
      seasonId,
    };

    if (episodeStatuses && episodeStatuses.length > 0) {
      matchConditions.status = { $in: episodeStatuses };
    }

    const episodes = await this.em.aggregate(Episode, [
      {
        $match: matchConditions,
      },
      {
        $addFields: {
          rawMediaId: {
            $ifNull: [
              '$visionularHls.rawMediaId',
              '$visionularHlsH265.rawMediaId',
            ],
          },
        },
      },
      {
        $lookup: {
          as: 'rawMedia',
          from: 'raw-media',
          let: { rawMediaId: { $toObjectId: '$rawMediaId' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$rawMediaId'] },
                    { $eq: ['$status', rawMediaStatus] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $match: {
          rawMedia: { $ne: [] },
        },
      },
      {
        $project: {
          rawMedia: 0,
        },
      },
    ]);

    return episodes.map((ep) =>
      this.em.create(Episode, ep, { persist: false }),
    );
  }

  async findMovieEpisodeBySlug(
    slug: string,
    dialect: Dialect,
  ): Promise<{
    englishMovieEpisode: Episode;
    hindiMovieEpisode: Episode;
  }> {
    const [englishMovieEpisode, hindiMovieEpisode] = await Promise.all([
      this.findOneOrFail({ displayLanguage: Lang.EN, language: dialect, slug }),
      this.findOneOrFail({
        displayLanguage: Lang.HIN,
        language: dialect,
        slug,
      }),
    ]);

    return { englishMovieEpisode, hindiMovieEpisode };
  }

  async save(episode: Episode): Promise<Episode> {
    this.em.persistAndFlush(episode);
    return episode;
  }

  async updateEpisodes({
    enArtistList,
    enContentId,
    enGenreList,
    englishEpisodeId,
    enSeason,
    enShow,
    epData,
    episodeOrder,
    hinArtistList,
    hinContentId,
    hindiEpisodeId,
    hinEpData,
    hinGenreList,
    hinSeason,
    hinShow,
  }: {
    englishEpisodeId: number;
    hindiEpisodeId: number;
    epData: EpisodeDTO;
    hinEpData: EpisodeDTO;
    enContentId: number;
    hinContentId: number;
    episodeOrder: number;
    enGenreList: EpisodeGenreDto[];
    hinGenreList: EpisodeGenreDto[];
    enShow: Show;
    hinShow: Show;
    enSeason: Seasons;
    hinSeason: Seasons;
    enArtistList: EmbeddableLegacyArtist[];
    hinArtistList: EmbeddableLegacyArtist[];
  }) {
    const englishEpisode = await this.findOneOrFail({
      _id: englishEpisodeId,
      showId: enContentId,
    });
    const hindiEpisode = await this.findOneOrFail({
      _id: hindiEpisodeId,
      showId: hinContentId,
    });

    // Process English thumbnail
    const englishThumbnail = {
      horizontal: {
        ratio1: {
          gradient: epData.meta.en.thumbnails.horizontal.ratio1.gradient,
          sourceLink: epData.meta.en.thumbnails.horizontal.ratio1.sourceLink,
        },
        ratio2: {
          gradient: epData.meta.en.thumbnails.horizontal.ratio1.gradient,
          sourceLink: epData.meta.en.thumbnails.horizontal.ratio1.sourceLink,
        },
        ratio3: {
          // This is required by the mobile app
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: epData.meta.en.thumbnails.square.ratio1.gradient,
          sourceLink: epData.meta.en.thumbnails.square.ratio1.sourceLink,
        },
      },
      vertical: {
        ratio1: {
          gradient: epData.meta.en.thumbnails.vertical.ratio1.gradient,
          sourceLink: epData.meta.en.thumbnails.vertical.ratio1.sourceLink,
        },
      },
    };
    englishEpisode.thumbnail = englishThumbnail;

    // Update episode details
    englishEpisode.title = epData.meta.en.title;
    englishEpisode.genreList = enGenreList;
    englishEpisode.description = epData.meta.en.description;
    englishEpisode.introEndTime = this.calculateTimeSpanInSeconds(
      epData.introEnd,
    );
    englishEpisode.introStartTime = this.calculateTimeSpanInSeconds(
      epData.introStart,
    );
    englishEpisode.nextEpisodeNudgeStartTime = this.calculateTimeSpanInSeconds(
      epData.nextEpisodeNudge,
    );
    englishEpisode.order = epData.order;
    englishEpisode.episodeOrder = episodeOrder;
    englishEpisode.visionularHls.rawMediaId = epData.rawMediaId;
    englishEpisode.visionularHlsH265.rawMediaId = epData.rawMediaId;
    englishEpisode.subtitle = updateSubtitleMetadataOnChanges({
      currentSubtitle: englishEpisode.subtitle,
      localUpload: !!epData.subtitle?.enMetadata,
      newEnFile: epData.subtitle?.en,
      newHinFile: epData.subtitle?.hin,
    });
    englishEpisode.parentDetail = {
      seasonTitle: enSeason.title,
      slug: enShow.slug,
      sourceLink: enShow.thumbnail.horizontal.ratio2?.sourceLink ?? '',
      title: enShow.title,
    };
    englishEpisode.preContentWarningText =
      englishEpisode.preContentWarningText ?? '';
    englishEpisode.artistList = enArtistList;

    // Update or add trailer for English episode
    if (epData.meta.en.trailer) {
      englishEpisode.mediaList = this.updateOrAddTrailerToMediaList(
        epData.meta.en.trailer,
        englishEpisode.mediaList,
      );
    } else {
      englishEpisode.mediaList = [];
    }

    const hindiThumbnail = {
      horizontal: {
        ratio1: {
          gradient: hinEpData.meta.hin.thumbnails.horizontal.ratio1.gradient,
          sourceLink:
            hinEpData.meta.hin.thumbnails.horizontal.ratio1.sourceLink,
        },
        ratio2: {
          gradient: hinEpData.meta.hin.thumbnails.horizontal.ratio1.gradient,
          sourceLink:
            hinEpData.meta.hin.thumbnails.horizontal.ratio1.sourceLink,
        },
        // This is required by the mobile app
        ratio3: {
          gradient: '',
          sourceLink: '',
        },
      },
      square: {
        ratio1: {
          gradient: hinEpData.meta.hin.thumbnails.square.ratio1.gradient,
          sourceLink: hinEpData.meta.hin.thumbnails.square.ratio1.sourceLink,
        },
      },
      vertical: {
        ratio1: {
          gradient: hinEpData.meta.hin.thumbnails.vertical.ratio1.gradient,
          sourceLink: hinEpData.meta.hin.thumbnails.vertical.ratio1.sourceLink,
        },
      },
    };

    hindiEpisode.thumbnail = hindiThumbnail;
    hindiEpisode.genreList = hinGenreList;
    hindiEpisode.title = hinEpData.meta.hin.title;
    hindiEpisode.description = hinEpData.meta.hin.description;
    hindiEpisode.introEndTime = this.calculateTimeSpanInSeconds(
      hinEpData.introEnd,
    );
    hindiEpisode.introStartTime = this.calculateTimeSpanInSeconds(
      hinEpData.introStart,
    );
    hindiEpisode.nextEpisodeNudgeStartTime = this.calculateTimeSpanInSeconds(
      hinEpData.nextEpisodeNudge,
    );
    hindiEpisode.order = hinEpData.order;
    hindiEpisode.episodeOrder = episodeOrder;
    hindiEpisode.visionularHls.rawMediaId = epData.rawMediaId;
    hindiEpisode.visionularHlsH265.rawMediaId = epData.rawMediaId;
    hindiEpisode.subtitle = updateSubtitleMetadataOnChanges({
      currentSubtitle: hindiEpisode.subtitle,
      localUpload: !!epData.subtitle?.hinMetadata,
      newEnFile: epData.subtitle?.en,
      newHinFile: epData.subtitle?.hin,
    });
    hindiEpisode.parentDetail = {
      seasonTitle: hinSeason.title,
      slug: hinShow.slug,
      sourceLink: hinShow.thumbnail.horizontal.ratio2?.sourceLink ?? '',
      title: hinShow.title,
    };
    hindiEpisode.preContentWarningText =
      hindiEpisode.preContentWarningText ?? '';
    hindiEpisode.artistList = hinArtistList;

    // Update or add trailer for Hindi episode
    if (hinEpData.meta.hin.trailer) {
      hindiEpisode.mediaList = this.updateOrAddTrailerToMediaList(
        hinEpData.meta.hin.trailer,
        hindiEpisode.mediaList,
      );
    } else {
      hindiEpisode.mediaList = [];
    }

    await this.save(englishEpisode);
    await this.save(hindiEpisode);

    return { englishEpisode, hindiEpisode };
  }

  async updateMovieEpisode({
    dialect,
    language,
    payload,
    slug,
  }: {
    slug: string;
    payload: Partial<Episode>;
    language: Lang;
    dialect: Dialect;
  }): Promise<Episode> {
    const episode = await this.findOne({
      displayLanguage: language,
      language: dialect,
      slug,
    });

    if (!episode) {
      throw new Error('Movie episode not found');
    }

    return this.em.assign(episode, payload);
  }
}
