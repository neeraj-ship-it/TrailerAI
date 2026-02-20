import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { FilterQuery, Transactional } from '@mikro-orm/mongodb';

import { ObjectId } from '@mikro-orm/mongodb';

import type {
  categoryDTO,
  complianceDTO,
  showGenreDTO,
  SubGenreDTO,
} from '../dtos/category.dto';

import type {
  ContentFilters,
  CreateOrUpdateMovieDTO,
  CreateShowDTO,
  IContentMediaItem,
  IMediaItem,
  MovieResponseDTO,
  PaginatedResponse,
  ScheduleEpisodeDTO,
  SeasonDTO,
  ThumbnailWithCtr,
  UpdateShowDTO,
} from '../dtos/content.dto';
import {
  SortByEnum,
  SortOrderEnum,
  type ArtistV2,
  type CombinedShowSeasonEpisodeResponseDTO,
  type EpisodeResponseDTO,
  type SeasonResponseDTO,
  type ShowDTO,
} from '../dtos/content.dto';
import { CMSUser } from '../entities/cms-user.entity';
import { Seasons, SeasonStatus } from '../entities/seasons.entity';
import { ImageOrientation, MP4Resolution } from '../interfaces/files.interface';
// import { EpisodeProcessingPayload } from '../interfaces/queue-payloads.interface';
import { ArtistRepositoryV2 } from '../repositories/artist.repository';
import { CmsAssetMonitoringLogRepository } from '../repositories/cms-asset-monitoring-log.repository';
import { CMSUserRepository } from '../repositories/cms-user.repository';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ContentRepository } from '../repositories/content.repository';
import { DescriptorTagRepository } from '../repositories/descriptor-tag.repository';
import { EpisodeRepository } from '../repositories/episode.repository';
import { GenreRepository } from '../repositories/genre.repository';
import { LegacyGenreRepository } from '../repositories/legacy-genre.repository';
import { MoodRepository } from '../repositories/mood.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { SeasonRepository } from '../repositories/season.repository';
import { ShowRepository } from '../repositories/show.repository';
import { SubGenreRepository } from '../repositories/subgenre.repository';
import { ThemeRepository } from '../repositories/theme.repository';
import { ThumbnailCtrRepository } from '../repositories/thumbnail-ctr.repository';
import {
  convertArtistsToLegacyFormat,
  enrichArtistData,
} from '../utils/artist.utils';
import {
  validateContentForPublishing,
  validateContentThumbnailForPublishing,
  validateEpisodeForPublishing,
  validateMovieForPublishing,
  validateSeasonForPublishing,
  validateShowForPublishing,
} from '../utils/content-schema-validators.utils';
import {
  transformSubtitleFromDto,
  transformSubtitleToDto,
  updateSubtitleMetadataOnChanges,
} from '../utils/content.utils';
import {
  convertContentThumbnailToShowThumbnail,
  convertEpisodeThumbnailToShowThumbnail,
  convertMetaTrailerToPeripheral,
  convertShowThumbnailToContentThumbnail,
  convertThumbnailDTOToShowThumbnail,
  processMediaItemDtoToMediaList,
} from '../utils/thumbnail.utils';
import {
  calculateNextEpisodeNudgeStartTime,
  calculateRemainingForNextEpisodeNudgeInSeconds,
  secondsToHMS,
} from '../utils/time.utils';
import { ComingSoonService } from './coming-soon.service';
import { ContentCensorService } from './content-censor.service';
import { FileManagerService } from './file-manager.service';
import { AWSMediaConvertService } from './media-convert.service';
import { PlatterService } from './platter.service';
// import { CMSQueueDispatcher } from './queue-dispatcher.service';
import { ReelService } from './reel.service';
import { type Context } from '@app/auth';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType, ContentTypeV2 } from '@app/common/enums/common.enums';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ContentSensorRedisStore } from '@app/redis';
import { S3Service } from '@app/storage';
import { APP_CONFIGS } from 'common/configs/app.config';
import {
  ComplianceRating,
  ContentFormat,
  Contents,
  ContentStatus,
  AllThumbnail as ContentThumbnail,
  EmbeddableArtistV2,
  MediaItem,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';
import { EpisodeType } from 'common/entities/episode.entity';
import { Episode, EpisodeStatus } from 'common/entities/episode.entity';
import {
  RawMedia,
  TaskStatusEnum,
  TranscodingEngineEnum,
} from 'common/entities/raw-media.entity';
import {
  AllShowThumbnails,
  Show,
  ShowStatus,
} from 'common/entities/show-v2.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';
import { COMING_SOON_LABEL_CONSTANTS } from 'src/content/constants/cta.constants';
// Define interfaces for content service result structure
export interface ShowResult {
  en: {
    show: unknown;
    seasons: Seasons[];
    episodes: Episode[];
  };
  hin: {
    show: unknown;
    seasons: Seasons[];
    episodes: Episode[];
  };
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly legacyShowRepository: ShowRepository,
    private readonly genreRepository: GenreRepository,
    private readonly legacyGenreRepository: LegacyGenreRepository,
    private readonly subGenreRepository: SubGenreRepository,
    private readonly complianceRepository: ComplianceRepository,
    private readonly episodeRepository: EpisodeRepository,
    private readonly moodRepository: MoodRepository,
    private readonly themeRepository: ThemeRepository,
    private readonly descriptorTagRepository: DescriptorTagRepository,
    private readonly ArtistRepositoryV2: ArtistRepositoryV2,
    private readonly s3Service: S3Service,
    private readonly cmsUserRepository: CMSUserRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly fileManager: FileManagerService,
    private readonly comingSoonService: ComingSoonService,
    private readonly reelService: ReelService,
    private readonly platterService: PlatterService,
    private readonly contentSensorRedisStore: ContentSensorRedisStore,
    private readonly contentCensorService: ContentCensorService,
    private readonly thumbnailCtrRepository: ThumbnailCtrRepository,
    private readonly awsMediaConvertService: AWSMediaConvertService,
    private readonly cmsAssetMonitoringLogRepository: CmsAssetMonitoringLogRepository,
    // private readonly cmsQueueDispatcher: CMSQueueDispatcher,
  ) {
    // this.migrateThumbnails();
  }

  private async addLabelTextToShow(
    showSlug: string,
    dialect: Dialect,
  ): Promise<void> {
    const shows = await this.contentRepository.find({
      contentType: ContentTypeV2.SHOW,
      dialect,
      slug: showSlug,
    });

    const legacyShows = await this.legacyShowRepository.find({
      language: dialect,
      slug: showSlug,
    });

    shows.forEach((show) => {
      show.label = COMING_SOON_LABEL_CONSTANTS.LABEL_TEXT[show.language] ?? '';
    });
    legacyShows.forEach((legacyShow) => {
      legacyShow.label =
        COMING_SOON_LABEL_CONSTANTS.LABEL_TEXT[legacyShow.displayLanguage] ??
        '';
    });
    await Promise.all([
      ...shows.map((show) => this.contentRepository.save(show)),
      ...legacyShows.map((legacyShow) =>
        this.legacyShowRepository.save(legacyShow),
      ),
    ]);
  }
  private calculateTimeSpanInSeconds({
    hours,
    minutes,
    seconds,
  }: {
    hours: number;
    minutes: number;
    seconds: number;
  }): number {
    return hours * 3600 + minutes * 60 + seconds;
  }

  private extractGenreIds(
    contents: Pick<Contents, 'genres'>[],
    genreIds: Set<number>,
  ): void {
    contents.forEach((content) => {
      (content.genres || []).forEach((genre) => {
        genreIds.add(genre.id);
      });
    });
  }

  private extractSubGenreIds(
    contents: Pick<Contents, 'subGenres'>[],
    subGenreIds: Set<number>,
  ): void {
    contents.forEach((content) => {
      (content.subGenres || []).forEach((subgenre) => {
        subGenreIds.add(subgenre.id);
      });
    });
  }

  private generateSlug(title: string, dialect: Dialect): string {
    if (!title || typeof title !== 'string') {
      throw new Error('Title is required for slug generation');
    }

    const slug = title
      .toLowerCase()
      .trim()
      .normalize('NFD') // replace accented characters with their non-accented equivalents
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '') // replace all non-alphanumeric characters (except spaces) with empty string
      .replace(/\s+/g, '-') // replace multiple spaces with single dash
      .replace(/-+/g, '-') // remove any duplicate dashes
      .replace(/^-+|-+$/g, ''); // remove leading and trailing dashes
    /* This is to ensure that the slug is unique for the production environment,
    and in the S3 bucket content directory to identify the content in those bucket to avoid conflicts*/
    const dialectSlug = `${slug}-${dialect}`;
    return APP_CONFIGS.PLATFORM.IS_PRODUCTION
      ? dialectSlug
      : `${dialectSlug}-${APP_CONFIGS.PLATFORM.ENV}`;
  }

  private async generateThumbnailPreviewUrl(
    contentType: ContentTypeV2,
    sourceLink: string,
  ): Promise<string> {
    if (!sourceLink || sourceLink.trim() === '') {
      return '';
    }

    const { bucket, small } = MediaFilePathUtils.generateThumbnailFilePath({
      contentType:
        contentType === ContentTypeV2.SHOW
          ? ContentType.SHOW
          : ContentType.EPISODE,
      orientation: ImageOrientation.HORIZONTAL,
    });

    return this.s3Service.generateViewSignedUrl({
      bucket,
      key: small + sourceLink,
    });
  }

  private async getEpisodeTeaser(
    mediaList: MediaItem[] | undefined,
  ): Promise<IMediaItem | undefined> {
    const teaser = mediaList?.find(
      (m) => m.mediaType === PeripheralMediaType.TEASER,
    );
    if (!teaser) {
      return undefined;
    }
    const rawMediaStatus = teaser.rawMediaId
      ? await this.rawMediaRepository.findRawMediaStatus(teaser.rawMediaId)
      : null;
    return {
      description: teaser.description,
      id: teaser.id,
      mediaType: teaser.mediaType,
      rawMediaId: teaser.rawMediaId,
      rawMediaStatus,
      selectedPeripheralStatus: teaser.selectedPeripheralStatus,
      sourceLink: teaser.sourceLink,
      thumbnail: {
        horizontal: { sourceLink: teaser.thumbnail.horizontal.sourceLink },
        square: { sourceLink: teaser.thumbnail.square.sourceLink },
        vertical: { sourceLink: teaser.thumbnail.vertical.sourceLink },
      },
      title: teaser.title,
    };
  }

  private getMediaConvertJobId(rawMedia: Partial<RawMedia>): string | null {
    if (!rawMedia.transcodingTask || rawMedia.transcodingTask.length === 0) {
      return null;
    }

    const mediaConvertTask = rawMedia.transcodingTask.find(
      (task) =>
        task.transcodingEngine === TranscodingEngineEnum.AWS_MEDIA_CONVERT,
    );

    return mediaConvertTask?.externalTaskId || null;
  }

  private async getTrailers(
    englishMediaList: IContentMediaItem[],
    hindiMediaList: IContentMediaItem[],
  ) {
    const englishTrailers = await Promise.all(
      englishMediaList.map(async (trailer) => {
        return {
          ...trailer,
          rawMediaStatus: trailer.rawMediaId
            ? await this.rawMediaRepository.findRawMediaStatus(
                trailer.rawMediaId,
              )
            : null,
          sourceLink: trailer.sourceLink || '',
        };
      }),
    );

    const hindiTrailers = hindiMediaList.map((trailer) => ({
      ...trailer,
      rawMediaStatus: englishTrailers.find(
        (t) => t.rawMediaId === trailer.rawMediaId,
      )?.rawMediaStatus,
      sourceLink: trailer.sourceLink || '',
    }));

    const emptyTrailerItem = {
      description: '',
      mediaType: PeripheralMediaType.TRAILER,
      rawMediaId: '',
      rawMediaStatus: null,
      selectedPeripheralStatus: true,
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
    };
    return {
      englishTrailers:
        englishTrailers.length > 0 ? englishTrailers : [emptyTrailerItem],
      hindiTrailers:
        hindiTrailers.length > 0 ? hindiTrailers : [emptyTrailerItem],
    };
  }

  private initializeResultObject({
    existingEnglishShow,
    existingHindiShow,
  }: {
    existingEnglishShow: Contents;
    existingHindiShow: Contents;
  }): ShowResult {
    return {
      en: {
        episodes: [],
        seasons: [],
        show: existingEnglishShow,
      },
      hin: {
        episodes: [],
        seasons: [],
        show: existingHindiShow,
      },
    };
  }

  private async mapEpisodeToResponse(
    ep: Episode,
  ): Promise<Omit<EpisodeResponseDTO, 'rawMediaStatus' | 'rawMediaLink'>> {
    const trailer = await this.getEpisodeTeaser(ep.mediaList);
    return {
      _id: ep._id,
      comingSoonDate: ep.comingSoonDate || null,
      duration: ep.duration,
      episodeOrder: ep.episodeOrder,
      introEnd: secondsToHMS(ep.introEndTime || 0),
      introStart: secondsToHMS(ep.introStartTime || 0),
      isComingSoon: ep.isComingSoon === 1,
      meta: {
        en: {
          _id: ep._id,
          description: ep.description,
          slug: ep.slug,
          thumbnails: convertEpisodeThumbnailToShowThumbnail(ep.thumbnail),
          title: ep.title,
          trailer,
        },
        hin: {
          _id: ep._id,
          description: ep.description,
          slug: ep.slug,
          thumbnails: convertEpisodeThumbnailToShowThumbnail(ep.thumbnail),
          title: ep.title,
          trailer,
        },
      },
      nextEpisodeNudge: secondsToHMS(ep.nextEpisodeNudgeStartTime || 0),
      order: ep.order,
      rawMediaId: ep.visionularHls.rawMediaId,
      status: ep.status,
      subtitle: transformSubtitleToDto(ep.subtitle),
      transcodingStatus: ep.visionularHls?.status || null,
      videoFile: ep.sourceLink,
    };
  }

  private async migrateThumbnails() {
    const forkedRepo = this.legacyShowRepository.getEntityManager().fork();
    const shows = await forkedRepo.find(Show, {
      _id: { $gte: 15600 },
    });

    for (const show of shows) {
      show.allThumbnails.forEach((thumbnail) => {
        thumbnail.horizontal.ratio4 = thumbnail.horizontal.ratio2;
      });
      await forkedRepo.persistAndFlush(show);
    }
  }

  private async slugExists({
    dialect,
    title,
  }: {
    title: string;
    dialect: Dialect;
  }): Promise<string> {
    const slug = this.generateSlug(title, dialect);
    const exists = await this.contentRepository.findOne({ slug });
    if (exists) {
      throw new Error(
        'Cannot use this title for slug, please use different title',
      );
    }

    return slug;
  }

  private updateContentEntity({
    artistList,
    complianceItems,
    complianceRating,
    contentEntity: contents,
    descriptorTags,
    episodeCount,
    genres,
    gradients,
    mediaList,
    moods,
    plotKeywords,
    primaryDialect,
    releaseDate,
    seasonCount,
    showMeta,
    subGenres,
    targetAudience,
    themes,
    upcomingScheduleText,
    userName,
  }: {
    contentEntity: Contents;
    showMeta: ShowDTO;
    genres: showGenreDTO[];
    subGenres: SubGenreDTO[];
    complianceItems: complianceDTO[];
    gradients: string[];
    moods: categoryDTO[];
    themes: categoryDTO[];
    plotKeywords: string[];
    complianceRating: ComplianceRating | null;
    releaseDate: Date;
    episodeCount: number;
    userName: string;
    artistList: EmbeddableArtistV2[];
    descriptorTags: categoryDTO[];
    primaryDialect: Dialect;
    targetAudience: string[];
    seasonCount: number;
    mediaList: MediaItem[];
    upcomingScheduleText: string;
  }): void {
    contents.artistList = artistList;
    contents.title = showMeta.title;
    contents.description = showMeta.description;
    contents.metaDescription = showMeta.description;
    // Only update selectedPeripheral.title and selectedPeripheral.description if present in peripheralData

    contents.mediaList = mediaList;
    contents.selectedPeripheral =
      mediaList.find((m) => m.selectedPeripheralStatus === true) ??
      mediaList[0];

    contents.genres = genres.map((genre) => ({
      id: genre.id,
      name: contents.language === Lang.EN ? genre.name : genre.hindiName,
    }));
    contents.subGenres = subGenres.map((subGenre) => ({
      id: subGenre._id,
      name: contents.language === Lang.EN ? subGenre.name : subGenre.hinName,
    }));
    contents.complianceList = complianceItems.map((compliance) => ({
      id: compliance._id,
      name: compliance.name,
    }));
    contents.complianceRating = complianceRating;
    contents.plotKeywords = plotKeywords;
    contents.gradients = gradients;
    contents.moods = moods.map((mood) => ({
      id: mood._id,
      name: contents.language === Lang.EN ? mood.name : mood.hindiName,
    }));
    contents.descriptorTags = descriptorTags.map((dt) => ({
      id: dt._id,
      name: contents.language === Lang.EN ? dt.name : dt.hindiName,
    }));
    contents.themes = themes.map((theme) => ({
      id: theme._id,
      name: contents.language === Lang.EN ? theme.name : theme.hindiName,
    }));
    contents.releaseDate = releaseDate;
    contents.episodeCount = episodeCount;
    contents.updatedBy = userName;
    contents.primaryDialect = primaryDialect;
    contents.targetAudience = targetAudience;
    contents.seasonCount = seasonCount;

    contents.upcomingScheduleText = upcomingScheduleText;
  }

  private async updateDurationInAllPlaces(
    episode: Episode,
    durationInSeconds: number,
    rawMedia: Partial<RawMedia> & { _id: unknown },
  ): Promise<void> {
    await this.errorHandler.try(
      async () => {
        episode.duration = durationInSeconds;
        rawMedia.durationInSeconds = durationInSeconds;
        await Promise.all([
          this.episodeRepository.save(episode),
          this.rawMediaRepository.save(rawMedia as RawMedia),
        ]);

        this.logger.log(
          `Updated duration to ${durationInSeconds}s for episode ${episode.slug}`,
        );
      },
      (error) => {
        this.logger.error({ error }, `Failed to update duration in all places`);
      },
    );
  }

  private updateGenreDialectMap(
    contents: Pick<Contents, 'genres' | 'dialect'>[],
    dialectMap: Map<number, Set<string>>,
  ): void {
    contents.forEach((content) => {
      const contentDialect = content.dialect;
      (content.genres || []).forEach((genre) => {
        if (!dialectMap.has(genre.id)) {
          dialectMap.set(genre.id, new Set());
        }
        dialectMap.get(genre.id)?.add(contentDialect);
      });
    });
  }

  private async updateGenresAndSubgenreStatus(): Promise<void> {
    await this.errorHandler.try(
      async () => {
        const usedGenreIds = new Set<number>();
        const usedSubGenreIds = new Set<number>();
        const genreDialectMap = new Map<number, Set<string>>();

        const activeShowList = await this.legacyShowRepository.find(
          { status: ShowStatus.ACTIVE },
          { fields: ['genreList', 'subGenreList', 'language'] },
        );

        const activeIndividualList = await this.episodeRepository.find(
          { status: EpisodeStatus.ACTIVE, type: EpisodeType.INDIVIDUAL },
          { fields: ['genreList', 'subGenreList', 'language'] },
        );

        activeShowList.forEach((show) => {
          (show.genreList || []).forEach((genre) => {
            usedGenreIds.add(genre.id);
            if (!genreDialectMap.has(genre.id)) {
              genreDialectMap.set(genre.id, new Set());
            }
            genreDialectMap.get(genre.id)?.add(show.language);
          });
          (show.subGenreList || []).forEach((subgenre) => {
            usedSubGenreIds.add(subgenre.id);
          });
        });

        activeIndividualList.forEach((episode) => {
          (episode.genreList || []).forEach((genre) => {
            usedGenreIds.add(genre.id);
            if (!genreDialectMap.has(genre.id)) {
              genreDialectMap.set(genre.id, new Set());
            }
            genreDialectMap.get(genre.id)?.add(episode.language);
          });
          (episode.subGenreList || []).forEach((subgenre) => {
            usedSubGenreIds.add(subgenre.id);
          });
        });

        const genreIdsArray = Array.from(usedGenreIds);
        const subGenreIdsArray = Array.from(usedSubGenreIds);

        await Promise.all([
          this.legacyGenreRepository.nativeUpdate(
            { id: { $nin: genreIdsArray }, status: 'active' },
            { isUsed: false },
          ),
          this.genreRepository.nativeUpdate(
            { _id: { $nin: genreIdsArray }, status: ContentStatus.ACTIVE },
            { isUsed: false },
          ),
          this.subGenreRepository.nativeUpdate(
            { id: { $nin: subGenreIdsArray }, status: ContentStatus.ACTIVE },
            { isUsed: false },
          ),
        ]);

        await Promise.all([
          this.legacyGenreRepository.nativeUpdate(
            { id: { $in: genreIdsArray }, status: 'active' },
            { isUsed: true },
          ),
          this.genreRepository.nativeUpdate(
            { _id: { $in: genreIdsArray }, status: ContentStatus.ACTIVE },
            { isUsed: true },
          ),
          this.subGenreRepository.nativeUpdate(
            { id: { $in: subGenreIdsArray }, status: ContentStatus.ACTIVE },
            { isUsed: true },
          ),
        ]);

        await Promise.all(
          Array.from(genreDialectMap.entries()).map(
            async ([genreId, dialects]) => {
              try {
                await Promise.all([
                  this.legacyGenreRepository.nativeUpdate(
                    { id: genreId },
                    { dialect: Array.from(dialects) },
                  ),
                  this.genreRepository.nativeUpdate(
                    { _id: genreId },
                    { dialect: Array.from(dialects) },
                  ),
                ]);
              } catch (error) {
                this.logger.warn(
                  `Failed to update dialect for genre ${genreId}:`,
                  error instanceof Error ? error.message : String(error),
                  error instanceof Error ? error.stack : undefined,
                );
              }
            },
          ),
        );

        this.logger.log(
          'Updated genres and subgenres usage status and dialects successfully',
        );
      },
      (error) => {
        this.logger.error(
          'Error updating genres and subgenres usage status:',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
          error,
        );
      },
    );
  }

  private async updateOrCreateSeasons({
    contentSlug,
    dialect,
    enSeasonMeta,
    episodeCount,
    existingEnglishShow,
    existingHindiShow,
    gradients,
    hinSeasonMeta,
  }: {
    enSeasonMeta: SeasonDTO['meta']['en'];
    hinSeasonMeta: SeasonDTO['meta']['hin'];
    existingEnglishShow: Contents;
    existingHindiShow: Contents;
    contentSlug: string;
    dialect: Dialect;
    gradients: string[];
    episodeCount: number;
  }) {
    let englishSeason, hindiSeason;
    const enTransformedThumbnailSeason = existingEnglishShow.allThumbnails.map(
      convertContentThumbnailToShowThumbnail,
    );
    const hinTransformedThumbnailSeason = existingHindiShow.allThumbnails.map(
      convertContentThumbnailToShowThumbnail,
    );
    if (enSeasonMeta._id) {
      // Update existing season using repository method
      englishSeason = await this.seasonRepository.updateSeason({
        allThumbnail: enTransformedThumbnailSeason,
        episodeCount,
        existingShow: existingEnglishShow,
        gradients,
        seasonId: enSeasonMeta._id,
        seasonMeta: enSeasonMeta,
      });
    } else {
      // Create new season pair using repository method
      const seasonResult = await this.seasonRepository.createSeasonPair({
        contentSlug,
        dialect,
        englishShow: existingEnglishShow,
        enSeasonMeta,
        gradients,
        hindiShow: existingHindiShow,
        hinSeasonMeta,
      });

      englishSeason = seasonResult.englishSeason;
      hindiSeason = seasonResult.hindiSeason;
    }

    if (hinSeasonMeta._id) {
      // Update existing Hindi season using repository method
      hindiSeason = await this.seasonRepository.updateSeason({
        allThumbnail: hinTransformedThumbnailSeason,
        episodeCount,
        existingShow: existingHindiShow,
        gradients,
        seasonId: hinSeasonMeta._id,
        seasonMeta: hinSeasonMeta,
      });
    } else if (!hindiSeason) {
      // Create new Hindi season if it wasn't created with the English one
      // Here we swap primary and secondary shows for the Hindi version
      const seasonResult = await this.seasonRepository.createSeasonPair({
        contentSlug,
        dialect,
        englishShow: existingHindiShow,
        enSeasonMeta: hinSeasonMeta,
        gradients,
        hindiShow: existingEnglishShow,
        hinSeasonMeta: enSeasonMeta,
      });

      hindiSeason = seasonResult.hindiSeason;
    }

    return { englishSeason, hindiSeason };
  }

  private async updateShowDuration(showSlug: string) {
    const [showsInAllLanguages, contentInAllLanguages] = await Promise.all([
      this.legacyShowRepository.find({
        slug: showSlug,
      }),
      this.contentRepository.find({
        contentType: ContentTypeV2.SHOW,
        slug: showSlug,
      }),
    ]);

    const englishEpisodes = await this.episodeRepository.find(
      {
        displayLanguage: Lang.EN,
        showSlug,
        status: EpisodeStatus.ACTIVE,
      },
      { fields: ['duration'] },
    );
    const totalEpisodeDuration = englishEpisodes.reduce(
      (acc, episode) => acc + episode.duration,
      0,
    );
    await Promise.all([
      ...showsInAllLanguages.map((show) => {
        show.duration = totalEpisodeDuration;
        return this.legacyShowRepository.save(show);
      }),
      ...contentInAllLanguages.map((content) => {
        content.duration = totalEpisodeDuration;
        return this.contentRepository.save(content);
      }),
    ]);
  }

  private async updateShowEntities({
    payload,
    totalEpisodeCount,
    userDetails,
  }: {
    payload: UpdateShowDTO;
    totalEpisodeCount: number;
    userDetails: CMSUser;
  }) {
    const {
      artistList,
      complianceList,
      complianceRating,
      defaultThumbnailIndex = 0,
      genreList,
      gradients,
      plotKeywords,
      primaryDialect,
      releaseDate,
      show,
      subGenreList,
      targetAudience,
    } = payload;
    const enShowMeta = show.meta[Lang.EN];
    const hinShowMeta = show.meta[Lang.HIN];
    const transformedReleaseDate = new Date(releaseDate);
    // Find the existing shows
    const [
      existingEnglishShow,
      existingHindiShow,
      genres = [],
      subGenres = [],
      complianceItems = [],
      moods = [],
      themes = [],
      descriptorTags = [],
      artistsRaw = [],
    ] = await Promise.all([
      this.contentRepository.findOneOrFail({
        contentId: enShowMeta.contentId,
        contentType: ContentTypeV2.SHOW,
      }),
      this.contentRepository.findOneOrFail({
        contentId: hinShowMeta.contentId,
        contentType: ContentTypeV2.SHOW,
      }),
      this.genreRepository.find({ _id: { $in: genreList } }),
      this.subGenreRepository.find({ _id: { $in: subGenreList } }),
      this.complianceRepository.find({ _id: { $in: complianceList } }),
      this.moodRepository.find({ _id: { $in: payload.moods } }),
      this.themeRepository.find({ _id: { $in: payload.themes } }),
      this.descriptorTagRepository.find({
        _id: { $in: payload.descriptorTags },
      }),
      this.ArtistRepositoryV2.find({
        slug: { $in: artistList.map((a) => a.slug) },
      }),
    ]);
    const orderedGenres = [];
    for (const genreId of genreList) {
      const genre = genres.find((g) => g._id.toString() === genreId.toString());
      if (genre) {
        orderedGenres.push(genre);
      }
    }

    const enrichedArtists = enrichArtistData(artistsRaw, payload.artistList);

    // Process thumbnails for both English and Hindi shows
    const enTransformedThumbnails: AllShowThumbnails[] = (
      enShowMeta.thumbnails || []
    ).map((t, i) => convertThumbnailDTOToShowThumbnail(t, i));
    const hinTransformedThumbnails: AllShowThumbnails[] = (
      hinShowMeta.thumbnails || []
    ).map((t, i) => convertThumbnailDTOToShowThumbnail(t, i));

    // Convert to content thumbnail format for content repository
    const enContentThumbnails: ContentThumbnail[] = enTransformedThumbnails.map(
      convertShowThumbnailToContentThumbnail,
    );

    const hinContentThumbnails: ContentThumbnail[] =
      hinTransformedThumbnails.map(convertShowThumbnailToContentThumbnail);

    const enMediaList: MediaItem[] = processMediaItemDtoToMediaList(
      enShowMeta.trailer,
      existingEnglishShow.mediaList,
    );

    const hinMediaList: MediaItem[] = processMediaItemDtoToMediaList(
      hinShowMeta.trailer,
      existingHindiShow.mediaList,
    );

    if (existingEnglishShow.status === ContentStatus.ACTIVE) {
      enContentThumbnails.forEach((thumbnail) => {
        validateContentThumbnailForPublishing(thumbnail);
      });
      hinContentThumbnails.forEach((thumbnail) => {
        validateContentThumbnailForPublishing(thumbnail);
      });
    }

    // Update content entities with thumbnails
    this.updateContentEntity({
      artistList: enrichedArtists,
      complianceItems,
      complianceRating,
      contentEntity: existingEnglishShow,
      descriptorTags,
      episodeCount: totalEpisodeCount,
      genres: orderedGenres.map((genre) => ({
        hindiName: genre.hindiName,
        id: genre._id,
        name: genre.name,
      })),
      gradients,
      mediaList: enMediaList,
      moods,
      plotKeywords,
      primaryDialect,
      releaseDate: transformedReleaseDate,
      seasonCount: payload.show.seasons.length,
      showMeta: enShowMeta,
      subGenres,
      targetAudience,
      themes,
      upcomingScheduleText: enShowMeta.upcomingScheduleText || '',
      userName: userDetails.getFullName(),
    });

    this.updateContentEntity({
      artistList: enrichedArtists,
      complianceItems,
      complianceRating,
      contentEntity: existingHindiShow,
      descriptorTags,
      episodeCount: totalEpisodeCount,
      genres: genres.map((genre) => ({
        hindiName: genre.hindiName,
        id: genre._id,
        name: genre.name,
      })),
      gradients,
      mediaList: hinMediaList,
      moods,
      plotKeywords,
      primaryDialect,
      releaseDate: transformedReleaseDate,
      seasonCount: payload.show.seasons.length,
      showMeta: hinShowMeta,
      subGenres,
      targetAudience,
      themes,
      upcomingScheduleText: hinShowMeta.upcomingScheduleText || '',
      userName: userDetails.getFullName(),
    });

    // Set thumbnails before saving
    existingEnglishShow.allThumbnails = enContentThumbnails;
    existingHindiShow.allThumbnails = hinContentThumbnails;
    existingEnglishShow.thumbnail =
      enContentThumbnails[existingEnglishShow.defaultThumbnailIndex];
    existingHindiShow.thumbnail =
      hinContentThumbnails[existingHindiShow.defaultThumbnailIndex];
    existingEnglishShow.mediaList = enMediaList;
    existingHindiShow.mediaList = hinMediaList;
    existingEnglishShow.defaultThumbnailIndex = defaultThumbnailIndex;
    existingHindiShow.defaultThumbnailIndex = defaultThumbnailIndex;

    await Promise.all([
      this.contentRepository.save(existingEnglishShow),
      this.contentRepository.save(existingHindiShow),
      this.legacyShowRepository.updateShowFromContent(
        existingEnglishShow.contentId,
        existingEnglishShow,
        totalEpisodeCount,
        enTransformedThumbnails,
        enMediaList,
      ),
      this.legacyShowRepository.updateShowFromContent(
        existingHindiShow.contentId,
        existingHindiShow,
        totalEpisodeCount,
        hinTransformedThumbnails,
        hinMediaList,
      ),
    ]);

    return { existingEnglishShow, existingHindiShow };
  }

  private async validateAndUpdateAllEpisodesDuration(
    slug: string,
    contentType: ContentTypeV2,
  ): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    const [result, err] = await this.errorHandler.try(async () => {
      // Step 1: Find the episode by slug
      let episodes: Episode[] = [];
      if (contentType === ContentTypeV2.SHOW) {
        episodes = await this.episodeRepository.find({ showSlug: slug });
      } else {
        episodes = await this.episodeRepository.find({ slug });
      }

      if (episodes.length === 0) {
        return {
          error: 'Episode not found',
          isValid: false,
        } as const;
      }

      for (const ep of episodes) {
        const validation = await this.validateEpisodeDuration(ep);
        if (!validation.isValid) {
          return {
            error: `Episode ${ep.slug}: ${validation.error}`,
            isValid: false,
          } as const;
        }
      }
      return {
        isValid: true,
      } as const;
    });

    if (err) {
      this.logger.error(`Error validating duration for ${slug}:`, err as Error);
      return {
        error: `Validation failed: ${(err as Error).message}`,
        isValid: false,
      };
    }

    if (!result) {
      return {
        error: 'Validation failed: Unknown error',
        isValid: false,
      };
    }
    return result;
  }

  private validateEpisodeCountPerLanguage(episodes: Episode[]): void {
    if (episodes.length < Object.values(Lang).length)
      throw Errors.EPISODE.INVALID_EPISODE_COUNT(
        `Expected ${Object.values(Lang).length} episodes, got ${episodes.length}`,
      );
  }

  private async validateEpisodeDuration(episode: Episode): Promise<{
    isValid: boolean;
    duration?: number;
    error?: string;
  }> {
    // Step 2: Check if episode already has valid duration - if yes, skip MediaConvert call
    if (episode.duration && episode.duration > 0) {
      return {
        duration: episode.duration,
        isValid: true,
      } as const;
    }

    //if transcoding is not complete, skip validation
    if (
      episode.status === EpisodeStatus.COMING_SOON &&
      !episode.visionularHls?.hlsSourcelink
    ) {
      return {
        duration: episode.duration,
        isValid: true,
      } as const;
    }

    // Step 3: Get rawMedia to access MediaConvert job information
    const rawMediaId = episode.visionularHls?.rawMediaId;
    if (!rawMediaId) {
      return {
        error: 'Raw media ID not found in episode',
        isValid: false,
      } as const;
    }

    const rawMedia = await this.rawMediaRepository.findOne({
      _id: new ObjectId(rawMediaId),
    });

    if (!rawMedia) {
      return {
        error: 'Raw media not found',
        isValid: false,
      } as const;
    }

    // Step 4: Extract MediaConvert job ID from transcoding tasks
    const jobId = this.getMediaConvertJobId(rawMedia);

    if (!jobId) {
      return {
        error: 'MediaConvert job ID not found',
        isValid: false,
      } as const;
    }

    // Step 5: Query MediaConvert to get job status and duration
    const jobDetails =
      await this.awsMediaConvertService.getMediaConvertJobDuration(jobId);

    if (!jobDetails) {
      return {
        error: 'Failed to fetch job details from MediaConvert',
        isValid: false,
      } as const;
    }

    // Step 6: Validate that the MediaConvert job is complete
    if (jobDetails.status !== 'COMPLETE') {
      return {
        error: `MediaConvert job is not complete. Current status: ${jobDetails.status}`,
        isValid: false,
      } as const;
    }

    // Step 7: Validate that duration is not zero
    if (jobDetails.durationInMs <= 0) {
      return {
        error: 'Duration is zero in MediaConvert output',
        isValid: false,
      } as const;
    }

    const durationInSeconds = Math.round(jobDetails.durationInMs / 1000);

    // Step 8: Update Episode and RawMedia with the correct duration
    await this.updateDurationInAllPlaces(episode, durationInSeconds, rawMedia);

    return {
      duration: durationInSeconds,
      isValid: true,
    } as const;
  }

  private validateEpisodeTitle(
    format: ContentFormat,
    title?: string,
    isMicrodrama = false,
  ): void {
    if (!isMicrodrama && format !== ContentFormat.MICRO_DRAMA && !title) {
      throw new Error('Episode title is required for non-microdrama shows');
    }
  }

  async cleanupExpiredShowLabels(): Promise<void> {
    this.logger.log('Starting cleanup of expired show labels');

    try {
      // Find all shows that have a label field
      const showsWithLabels = await this.legacyShowRepository.find({
        label: { $exists: true, $nin: [null, ''] },
      });

      if (showsWithLabels.length === 0) {
        this.logger.log('No shows with labels found');
        return;
      }

      this.logger.log(`Found ${showsWithLabels.length} shows with labels`);

      // Group shows by slug to process Hindi and English versions together
      const showsBySlug = new Map<string, typeof showsWithLabels>();
      for (const show of showsWithLabels) {
        if (!showsBySlug.has(show.slug)) {
          showsBySlug.set(show.slug, []);
        }
        const existingShows = showsBySlug.get(show.slug);
        if (existingShows) {
          existingShows.push(show);
        }
      }

      this.logger.log(`Processing ${showsBySlug.size} unique show slugs`);

      const updatePromises = [];
      const today = new Date();
      const EXPIRY_DAYS = COMING_SOON_LABEL_CONSTANTS.EXPIRY_DAYS;

      for (const [slug, showVersions] of showsBySlug) {
        try {
          // Find the latest coming soon episode for this show by slug
          const latestEpisode = await this.episodeRepository.findOne(
            {
              showSlug: slug,
              status: EpisodeStatus.ACTIVE,
            },
            {
              orderBy: { episodeOrder: 'desc' },
            },
          );

          let shouldRemoveLabel = false;

          if (!latestEpisode || !latestEpisode.comingSoonDate) {
            // No coming soon episode or no comingSoonDate, remove label
            shouldRemoveLabel = true;
            this.logger.debug(
              `Show ${slug}: No coming soon episode or date found, removing label`,
            );
          } else {
            // Check if comingSoonDate + 30 days has passed
            const expiryDate = new Date(
              latestEpisode.comingSoonDate.getTime() +
                EXPIRY_DAYS * 24 * 60 * 60 * 1000,
            );

            if (expiryDate < today) {
              shouldRemoveLabel = true;
              this.logger.debug(
                `Show ${slug}: Label expired (${expiryDate.toISOString()} < ${today.toISOString()}), removing label`,
              );
            } else {
              this.logger.debug(
                `Show ${slug}: Label still valid (${expiryDate.toISOString()} >= ${today.toISOString()})`,
              );
            }
          }

          if (shouldRemoveLabel) {
            for (const show of showVersions) {
              updatePromises.push(
                this.legacyShowRepository.nativeUpdate(
                  { _id: show._id },
                  { label: '' },
                ),
              );

              updatePromises.push(
                this.contentRepository.nativeUpdate(
                  { contentId: show._id },
                  { label: '' },
                ),
              );

              this.logger.debug(
                `Removing label from show ${show.slug} (${show.displayLanguage || show.language}) and its content`,
              );
            }
          }
        } catch (error) {
          this.logger.error(`Error processing show slug ${slug}:`, error);
          // Continue with other shows even if one fails
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        this.logger.log(
          `Successfully removed labels from ${updatePromises.length} show versions`,
        );
      } else {
        this.logger.log('No labels needed to be removed');
      }
    } catch (error) {
      this.logger.error('Error during show label cleanup:', error);
      throw error;
    }
  }

  @Transactional()
  async createMovie(
    payload: CreateOrUpdateMovieDTO,
    ctx: Context,
  ): Promise<MovieResponseDTO> {
    const dialect = ctx.meta.dialect;
    const {
      defaultThumbnailIndex = 0,
      movie,
      rawMediaId: movieMediaId,
    } = payload;
    const enMeta = movie.meta[Lang.EN];
    const hinMeta = movie.meta[Lang.HIN];
    const userDetails = await this.cmsUserRepository.findOneOrFail({
      _id: new ObjectId(ctx.user.id),
    });

    const contentSlug = await this.slugExists({
      dialect,
      title: enMeta.title,
    });

    const [
      genres = [],
      subGenres = [],
      complianceList = [],
      moods = [],
      themes = [],
      descriptorTags = [],
    ] = await Promise.all([
      this.genreRepository.find({ _id: { $in: payload.genreList } }),
      this.subGenreRepository.find({ _id: { $in: payload.subGenreList } }),
      this.complianceRepository.find({ _id: { $in: payload.complianceList } }),
      this.moodRepository.find({ _id: { $in: payload.moods } }),
      this.themeRepository.find({ _id: { $in: payload.themes } }),
      this.descriptorTagRepository.find({
        _id: { $in: payload.descriptorTags },
      }),
    ]);

    const orderedGenres = [];
    for (const genreId of payload.genreList) {
      const genre = genres.find((g) => g._id.toString() === genreId.toString());
      if (genre) {
        orderedGenres.push(genre);
      }
    }

    // Fetch and enrich artists
    const artistSlugs = payload.artistList.map((a) => a.slug);
    const artistsRaw =
      (await this.ArtistRepositoryV2.find({
        slug: { $in: artistSlugs },
      })) || [];

    const enrichedArtists = enrichArtistData(artistsRaw, payload.artistList);

    // Initialize transformed thumbnails
    const enTransformedThumbnails: AllShowThumbnails[] = (
      enMeta.thumbnails || []
    ).map((t, i) => convertThumbnailDTOToShowThumbnail(t, i));
    const hinTransformedThumbnails: AllShowThumbnails[] = (
      hinMeta.thumbnails || []
    ).map((t, i) => convertThumbnailDTOToShowThumbnail(t, i));

    // Convert to content thumbnail format
    const enContentThumbnails: ContentThumbnail[] = enTransformedThumbnails.map(
      convertShowThumbnailToContentThumbnail,
    );
    const enMediaList: MediaItem[] = processMediaItemDtoToMediaList(
      enMeta.trailer,
    );

    const hinMediaList: MediaItem[] = processMediaItemDtoToMediaList(
      hinMeta.trailer,
    );

    const enPeripheralData: IContentMediaItem[] = enMeta.trailer.map(
      (trailer) => convertMetaTrailerToPeripheral(trailer, trailer.rawMediaId),
    );

    const hinPeripheralData: IContentMediaItem[] = hinMeta.trailer.map(
      (trailer) => convertMetaTrailerToPeripheral(trailer, trailer.rawMediaId),
    );

    const hinContentThumbnails = hinTransformedThumbnails.map(
      convertShowThumbnailToContentThumbnail,
    );

    // Create the movie content
    const { englishMovie, hindiMovie } =
      await this.contentRepository.createDraftMovie({
        complianceList: complianceList.map((compliance) => ({
          id: compliance._id,
          name: compliance.name,
        })),
        complianceRating: payload.complianceRating,
        dialect,
        duration: 0,
        endDate: new Date(),
        gradients: payload.gradients,
        meta: {
          en: {
            artists: enrichedArtists,
            description: enMeta.description,
            descriptorTags: descriptorTags.map((descriptorTag) => ({
              id: descriptorTag._id,
              name: descriptorTag.name,
            })),
            genres: genres.map((genre) => ({
              id: genre._id,
              name: genre.name,
            })),
            label: '',
            moods: moods.map((mood) => ({
              id: mood._id,
              name: mood.name,
            })),
            subGenres: subGenres.map((subGenre) => ({
              id: subGenre._id,
              name: subGenre.name,
            })),
            themes: themes.map((theme) => ({
              id: theme._id,
              name: theme.name,
            })),
            title: enMeta.title,
            trailer:
              enPeripheralData.find(
                (p) => p.selectedPeripheralStatus === true,
              ) ?? enPeripheralData[0], // fallback to first item if no selectedPeripheralStatus is true
            upcomingScheduleText: enMeta.upcomingScheduleText || '',
          },
          hin: {
            artists: enrichedArtists,
            description: hinMeta.description,
            descriptorTags: descriptorTags.map((descriptorTag) => ({
              id: descriptorTag._id,
              name: descriptorTag.hindiName,
            })),
            genres: orderedGenres.map((genre) => ({
              id: genre._id,
              name: genre.hindiName,
            })),
            label: '',
            moods: moods.map((mood) => ({
              id: mood._id,
              name: mood.hindiName,
            })),
            subGenres: subGenres.map((subGenre) => ({
              id: subGenre._id,
              name: subGenre.hinName,
            })),
            themes: themes.map((theme) => ({
              id: theme._id,
              name: theme.hindiName,
            })),
            title: hinMeta.title,
            trailer:
              hinPeripheralData.find(
                (p) => p.selectedPeripheralStatus === true,
              ) ?? hinPeripheralData[0], // fallback to first item if no selectedPeripheralStatus is true
            upcomingScheduleText: hinMeta.upcomingScheduleText || '',
          },
        },
        movieMediaId: movieMediaId || '',
        plotKeywords: payload.plotKeywords,
        primaryDialect: payload.primaryDialect,
        releaseDate: !isNaN(new Date(payload.releaseDate).getTime())
          ? new Date(payload.releaseDate).toISOString()
          : new Date().toISOString(),
        slug: contentSlug,
        targetAudience: payload.targetAudience,
        userName: userDetails.getFullName(),
      });

    englishMovie.allThumbnails = enContentThumbnails;
    englishMovie.thumbnail = enContentThumbnails[defaultThumbnailIndex];
    englishMovie.mediaList = enMediaList;
    await this.contentRepository.save(englishMovie);

    hindiMovie.allThumbnails = hinContentThumbnails;
    hindiMovie.thumbnail = hinContentThumbnails[defaultThumbnailIndex];
    hindiMovie.mediaList = hinMediaList;
    await this.contentRepository.save(hindiMovie);

    // Create movie details using episode repository

    const { englishMovieEpisode } = await this.episodeRepository.createMovie({
      complianceRating: englishMovie.complianceRating,
      defaultThumbnailIndex: defaultThumbnailIndex,
      dialect,
      duration: 0,
      en: {
        description: payload.movie.meta.en.description,
        descriptorTag: englishMovie.descriptorTags,
        genreList: englishMovie.genres,
        moods: englishMovie.moods,
        subGenreList: englishMovie.subGenres,
        subtitle: payload.movie.subtitle?.en,
        themes: englishMovie.themes,
        thumbnails: payload.movie.meta.en.thumbnails,
        title: payload.movie.meta.en.title,
      },
      hin: {
        description: payload.movie.meta.hin.description,
        descriptorTag: englishMovie.descriptorTags,
        genreList: hindiMovie.genres,
        moods: englishMovie.moods,
        subGenreList: hindiMovie.subGenres,
        subtitle: payload.movie.subtitle?.hin,
        themes: englishMovie.themes,
        thumbnails: payload.movie.meta.hin.thumbnails,
        title: payload.movie.meta.hin.title,
      },
      introEndTime: payload.movie.introEnd,
      introStartTime: payload.movie.introStart,
      rawMediaId: movieMediaId || '',
      slug: contentSlug,
      userName: userDetails.getFullName(),
    });

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      englishMovie.mediaList,
      hindiMovie.mediaList,
    );

    // Prepare the response
    return {
      artistList: (englishMovie.artistList ?? []).map((a: ArtistV2) => ({
        character: a.character,
        role: a.role,
        slug: a.slug,
        type: a.type,
      })),
      complianceList: englishMovie.complianceList.map((c) => c.id) ?? [],
      complianceRating: englishMovie.complianceRating,
      descriptorTags: englishMovie.descriptorTags?.map((d) => d.id) ?? [],
      dialect: dialect,
      format: englishMovie.format,
      genreList: englishMovie.genres.map((g) => g.id) ?? [],
      gradients: englishMovie.gradients ?? [],
      moods: englishMovie.moods?.map((m) => m.id) ?? [],
      movie: {
        duration: englishMovie.duration,
        introEnd: secondsToHMS(englishMovieEpisode.introEndTime || 0),
        introStart: secondsToHMS(englishMovieEpisode.introStartTime || 0),
        meta: {
          [Lang.EN]: {
            contentId: englishMovie.contentId,
            description: englishMovie.description,
            label: englishMovie.label || '',
            slug: englishMovie.slug,
            thumbnails: englishMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: englishMovie.title,
            trailer: englishTrailers,
            upcomingScheduleText: englishMovie.upcomingScheduleText || '',
          },
          [Lang.HIN]: {
            contentId: hindiMovie.contentId,
            description: hindiMovie.description,
            label: hindiMovie.label || '',
            slug: hindiMovie.slug,
            thumbnails: hindiMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: hindiMovie.title,
            trailer: hindiTrailers,
            upcomingScheduleText: hindiMovie.upcomingScheduleText || '',
          },
        },
        subtitle: englishMovieEpisode.subtitle,
      },
      plotKeywords: englishMovie.plotKeywords ?? [],
      primaryDialect: englishMovie.primaryDialect,
      rawMediaId: englishMovieEpisode.visionularHls?.rawMediaId || '',
      rawMediaLink: englishMovieEpisode.sourceLink || null,
      rawMediaStatus: await this.rawMediaRepository.findRawMediaStatus(
        englishMovieEpisode.visionularHls?.rawMediaId ?? '',
      ),
      releaseDate: englishMovie.releaseDate?.toISOString() ?? '',
      status: englishMovie.status,
      subGenreList: englishMovie.subGenres?.map((sg) => sg.id) ?? [],
      targetAudience: englishMovie.targetAudience,
      themes: englishMovie.themes?.map((t) => t.id) ?? [],
      videoFile: englishMovieEpisode.sourceLink,
    };
  }

  @Transactional()
  async createShow(payload: CreateShowDTO, ctx: Context) {
    const dialect = ctx.meta.dialect;
    const { defaultThumbnailIndex = 0, show } = payload;
    const enMeta = show.meta[Lang.EN];
    const hinMeta = show.meta[Lang.HIN];
    const showMediaId = show.rawMediaId;
    const userDetails = await this.cmsUserRepository.findOneOrFail({
      _id: new ObjectId(ctx.user.id),
    });
    // Get the first season from the array
    const enSeasonMeta = show.seasons[0].meta.en;
    const hinSeasonMeta = show.seasons[0].meta.hin;
    const episodes = show.seasons[0].episodes;

    // Convert episodes to expected format
    episodes.forEach((episode) => {
      this.validateEpisodeTitle(payload.format, episode.meta.en.title);
    });

    const formattedEpisodes = episodes.map((episode, index) => {
      return {
        introEnd: episode.introEnd,
        introStart: episode.introStart,
        meta: {
          en: {
            description: episode.meta.en.description,
            thumbnails: episode.meta.en.thumbnails,
            title: episode.meta.en.title,
          },
          hin: {
            description: episode.meta.hin.description,

            thumbnails: episode.meta.hin.thumbnails,
            title: episode.meta.hin.title,
          },
        },
        nextEpisodeNudge: episode.nextEpisodeNudge,
        order: index + 1,
        rawMediaId: episode.rawMediaId,
        subtitle: transformSubtitleFromDto(episode.subtitle),
        videoFile: episode.videoFile,
      };
    });

    const contentSlug = await this.slugExists({
      dialect,
      title: enMeta.title,
    });

    const [
      // genres = [],
      subGenres = [],
      complianceList = [],
      moods = [],
      themes = [],
      descriptorTags = [],
    ] = await Promise.all([
      // this.genreRepository.find({ _id: { $in: payload.genreList } }),
      this.subGenreRepository.find({ _id: { $in: payload.subGenreList } }),
      this.complianceRepository.find({ _id: { $in: payload.complianceList } }),
      this.moodRepository.find({ _id: { $in: payload.moods } }),
      this.themeRepository.find({ _id: { $in: payload.themes } }),
      this.descriptorTagRepository.find({
        _id: { $in: payload.descriptorTags },
      }),
    ]);

    const genres = [];
    for (const genreId of payload.genreList) {
      const genre = await this.genreRepository.findOne({ _id: genreId });
      if (genre) {
        genres.push(genre);
      }
    }

    const artistSlugs = payload.artistList.map((a) => a.slug);
    const artistsRaw =
      (await this.ArtistRepositoryV2.find({
        slug: { $in: artistSlugs },
      })) || [];

    const enrichedArtists = enrichArtistData(artistsRaw, payload.artistList);

    // Initialize transformed thumbnails separately for English and Hindi
    const enTransformedThumbnails: AllShowThumbnails[] = (
      enMeta.thumbnails || []
    ).map((t, i) => {
      const th = convertThumbnailDTOToShowThumbnail(t, i);
      if (i === defaultThumbnailIndex) th.selected = true;
      return th;
    });
    const hinTransformedThumbnails: AllShowThumbnails[] = (
      hinMeta.thumbnails || []
    ).map((t, i) => {
      const th = convertThumbnailDTOToShowThumbnail(t, i);
      if (i === defaultThumbnailIndex) th.selected = true;
      return th;
    });

    // Convert to content thumbnail format for content repository
    const enContentThumbnails: ContentThumbnail[] = enTransformedThumbnails.map(
      convertShowThumbnailToContentThumbnail,
    );
    const enMediaList = processMediaItemDtoToMediaList(enMeta.trailer);

    const hinMediaList = processMediaItemDtoToMediaList(hinMeta.trailer);

    const enContentPeripheralData = enMeta.trailer.map((trailer) =>
      convertMetaTrailerToPeripheral(trailer, showMediaId),
    );

    const hinContentPeripheralData = hinMeta.trailer.map((trailer) =>
      convertMetaTrailerToPeripheral(trailer, showMediaId),
    );

    const hinContentThumbnails: ContentThumbnail[] =
      hinTransformedThumbnails.map(convertShowThumbnailToContentThumbnail);

    const { englishShow, hindiShow } =
      await this.contentRepository.createDraftShow({
        complianceList: complianceList.map((compliance) => ({
          id: compliance._id,
          name: compliance.name,
        })),
        complianceRating: payload.complianceRating,
        defaultThumbnailIndex: defaultThumbnailIndex ?? 0,
        dialect,
        duration: 0,
        endDate: new Date(),
        episodeCount: formattedEpisodes.length,
        format: payload.format,
        gradients: payload.gradients,
        meta: {
          en: {
            artists: enrichedArtists,
            description: enMeta.description,
            descriptorTags: descriptorTags.map((descriptorTag) => ({
              id: descriptorTag._id,
              name: descriptorTag.name,
            })),
            genres: genres.map((genre) => ({
              id: genre._id,
              name: genre.name,
            })),
            label: '',
            moods: moods.map((mood) => ({
              id: mood._id,
              name: mood.name,
            })),
            subGenres: subGenres.map((subGenre) => ({
              id: subGenre._id,
              name: subGenre.name,
            })),
            themes: themes.map((theme) => ({
              id: theme._id,
              name: theme.name,
            })),
            title: enMeta.title,
            trailer:
              enContentPeripheralData.find(
                (p) => p.selectedPeripheralStatus === true,
              ) ?? enContentPeripheralData[0], // fallback to first item if no selectedPeripheralStatus is true
            upcomingScheduleText: enMeta.upcomingScheduleText || '',
          },
          hin: {
            artists: enrichedArtists,
            description: hinMeta.description,
            descriptorTags: descriptorTags.map((descriptorTag) => ({
              id: descriptorTag._id,
              name: descriptorTag.hindiName,
            })),
            genres: genres.map((genre) => ({
              id: genre._id,
              name: genre.hindiName,
            })),
            label: '',
            moods: moods.map((mood) => ({
              id: mood._id,
              name: mood.hindiName,
            })),
            subGenres: subGenres.map((subGenre) => ({
              id: subGenre._id,
              name: subGenre.hinName,
            })),
            themes: themes.map((theme) => ({
              id: theme._id,
              name: theme.hindiName,
            })),
            title: hinMeta.title,
            trailer:
              hinContentPeripheralData.find(
                (p) => p.selectedPeripheralStatus === true,
              ) ?? hinContentPeripheralData[0], // fallback to first item if no selectedPeripheralStatus is true
            upcomingScheduleText: hinMeta.upcomingScheduleText || '',
          },
        },
        plotKeywords: payload.plotKeywords,
        primaryDialect: payload.primaryDialect,
        releaseDate: payload.releaseDate,
        seasonCount: show.seasons.length,
        showMediaId: showMediaId || '',
        slug: contentSlug,
        targetAudience: payload.targetAudience,
        userName: userDetails.getFullName(),
      });

    englishShow.allThumbnails = enContentThumbnails;
    englishShow.thumbnail =
      enContentThumbnails[defaultThumbnailIndex] || enContentThumbnails[0];
    englishShow.mediaList = enMediaList;

    await this.contentRepository.save(englishShow);

    hindiShow.allThumbnails = hinContentThumbnails;
    hindiShow.thumbnail =
      hinContentThumbnails[defaultThumbnailIndex] || hinContentThumbnails[0];
    hindiShow.mediaList = hinMediaList;
    await this.contentRepository.save(hindiShow);
    // hindiShow.selectedPeripheral.title = hindiShow
    await this.legacyShowRepository.createShow({
      englishShow,
      enMediaList,
      enTransformedThumbnails: enContentThumbnails.map(
        convertContentThumbnailToShowThumbnail,
      ),
      hindiShow,
      hinMediaList,
      hinTransformedThumbnails: hinContentThumbnails.map(
        convertContentThumbnailToShowThumbnail,
      ),
    });

    const { englishSeason, hindiSeason } =
      await this.seasonRepository.createDraftSeason({
        contentSlug,
        contributionField: englishShow._id.toString(),
        dialect,
        endDate: englishShow.endDate,
        episodeCount: formattedEpisodes.length,
        gradients: payload.gradients,
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
      });

    // Map DTO episodes to the structure expected by EpisodeRepository
    const draftEpisodesPayload = formattedEpisodes.map((ep) => {
      return {
        dialect,
        duration: englishShow.duration || 0,
        en: {
          description: ep.meta.en.description,
          genreList: englishShow.genres,
          seasonId: englishSeason._id,
          showId: englishShow.contentId,
          subGenreList: englishShow.subGenres,
          subtitle: ep.subtitle,
          thumbnail: ep.meta.en.thumbnails,
          title: ep.meta.en.title,
        },
        hin: {
          description: ep.meta.hin.description,
          genreList: hindiShow.genres,
          seasonId: hindiSeason._id,
          showId: hindiShow.contentId,
          subGenreList: hindiShow.subGenres,
          subtitle: ep.subtitle,
          thumbnail: ep.meta.hin.thumbnails,
          title: ep.meta.hin.title,
        },
        introEndTime: ep.introEnd,
        introStartTime: ep.introStart,
        nextEpisodeNudgeStartTime: ep.nextEpisodeNudge,
        order: ep.order,
        rawMediaId: ep.rawMediaId,
        seasonSlug: englishSeason.slug,
        showSlug: contentSlug,
        subtitle: ep.subtitle,
      };
    });

    // Ensure englishEpisodes and hindiEpisodes are defined
    const { englishEpisodes = [], hindiEpisodes = [] } =
      await this.episodeRepository.createDraftEpisodes({
        defaultThumbnailIndex: defaultThumbnailIndex ?? 0,
        episodes: draftEpisodesPayload,
        format: payload.format,
        showSlug: contentSlug,
      });

    // Pair up English and Hindi seasons and episodes by index
    const responseSeasons = await Promise.all(
      [englishSeason].map(async (enSeason: Seasons, idx: number) => {
        const hinSeason = [hindiSeason][idx];
        return {
          episodes: await Promise.all(
            englishEpisodes.map(async (enEp: Episode, epIdx: number) => {
              const hinEp = hindiEpisodes[epIdx];
              const rawMedia = (await ObjectId.isValid(
                enEp.visionularHls.rawMediaId,
              ))
                ? await this.rawMediaRepository.findOneOrFail({
                    _id: new ObjectId(enEp.visionularHls.rawMediaId),
                  })
                : null;

              return {
                _id: enEp._id,
                comingSoonDate: enEp.comingSoonDate || null,
                duration: enEp.duration,
                episodeOrder: enEp.episodeOrder,
                introEnd: secondsToHMS(enEp.introEndTime || 0),
                introStart: secondsToHMS(enEp.introStartTime || 0),
                isComingSoon: enEp.isComingSoon === 1,
                meta: {
                  en: (await this.mapEpisodeToResponse(enEp)).meta.en,
                  hin: hinEp
                    ? (await this.mapEpisodeToResponse(hinEp)).meta.hin
                    : (await this.mapEpisodeToResponse(enEp)).meta.en,
                },
                nextEpisodeNudge: secondsToHMS(
                  enEp.nextEpisodeNudgeStartTime || 0,
                ),
                order: enEp.order,
                rawMediaId: enEp.visionularHls?.rawMediaId || '',
                rawMediaLink: rawMedia?.source.url || null,
                rawMediaStatus: rawMedia?.status || null,
                status: enEp.status,
                subtitle: transformSubtitleToDto(enEp.subtitle),
                transcodingStatus: enEp.visionularHls?.status || null,
                videoFile: enEp.sourceLink,
              };
            }),
          ),
          meta: {
            en: {
              _id: enSeason._id,
              description: enSeason.description,
              title: enSeason.title,
            },
            hin: {
              _id: hinSeason?._id,
              description: hinSeason?.description ?? '',
              title: hinSeason?.title ?? '',
            },
          },
        };
      }),
    );

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      englishShow.mediaList,
      hindiShow.mediaList,
    );

    return {
      artistList: (englishShow.artistList ?? []).map((a: ArtistV2) => ({
        character: a.character,
        role: a.role,
        slug: a.slug,
        type: a.type,
      })),
      complianceList: englishShow.complianceList.map((c) => c.id) ?? [],
      complianceRating: englishShow.complianceRating,
      descriptorTags: englishShow.descriptorTags?.map((d) => d.id) ?? [],
      dialect: englishShow.dialect,
      format: englishShow.format,
      genreList: englishShow.genres.map((g) => g.id) ?? [],
      gradients: englishShow.gradients ?? [],
      moods: englishShow.moods?.map((m) => m.id) ?? [],
      plotKeywords: englishShow.plotKeywords ?? [],
      primaryDialect: englishShow.primaryDialect,
      releaseDate: englishShow.releaseDate?.toISOString() ?? '',
      show: {
        meta: {
          [Lang.EN]: {
            contentId: englishShow.contentId,
            description: englishShow.description,

            slug: englishShow.slug,
            thumbnails: englishShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: englishShow.title,
            trailer: englishTrailers,
            upcomingScheduleText: englishShow.upcomingScheduleText || '',
          },
          [Lang.HIN]: {
            contentId: hindiShow.contentId,
            description: hindiShow.description,

            slug: hindiShow.slug,
            thumbnails: hindiShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: hindiShow.title,
            trailer: hindiTrailers,
            upcomingScheduleText: hindiShow.upcomingScheduleText || '',
          },
        },
        rawMediaId: englishShow.selectedPeripheral.rawMediaId,
        seasons: responseSeasons,
      },
      status: englishShow.status,
      subGenreList: englishShow.subGenres?.map((sg) => sg.id) ?? [],
      targetAudience: englishShow.targetAudience,
      themes: englishShow.themes?.map((t) => t.id) ?? [],
    };
  }

  async getAllContentFilters(filters: ContentFilters) {
    const query: FilterQuery<Contents> = {};
    const { limit, offset } = filters;

    if (filters.contentType) {
      query.contentType = filters.contentType;
    }
    if (filters.dialect) {
      query.dialect = filters.dialect;
    }
    if (filters.language) {
      query.language = filters.language;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const { items: contents, total } =
      await this.contentRepository.findPaginated(
        {},
        {
          limit: limit + 1,
          offset,
        },
      );

    return {
      data: contents.slice(0, limit),
      pagination: {
        nextPageAvailable: contents.length > limit,
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
      },
      total,
    };
  }

  async getAllContentList(filters: ContentFilters): Promise<PaginatedResponse> {
    const {
      contentType,
      dialect,
      format,
      keyword,
      language = Lang.EN,
      limit,
      offset,
      sortBy = SortByEnum.CONTENT_ID,
      sortOrder = SortOrderEnum.DESC,
      status,
    } = filters;

    const filterQuery: FilterQuery<Contents> = {};
    if (dialect) filterQuery.dialect = dialect;
    if (language) filterQuery.language = language;
    if (contentType) filterQuery.contentType = contentType;
    if (keyword) filterQuery.title = new RegExp(keyword, 'i');
    if (format) filterQuery.format = format;
    // Always skip deleted, even if status is provided
    if (status) {
      filterQuery.status = { $eq: status, $ne: ContentStatus.DELETED };
    } else {
      filterQuery.status = { $ne: ContentStatus.DELETED };
    }

    const options = {
      limit,
      offset,
      sortBy,
      sortOrder,
    };

    const { items, total } = await this.contentRepository.findPaginated(
      filterQuery,
      options,
    );

    return {
      items: await Promise.all(
        items.map(async (item) => {
          const { bucket, small } =
            MediaFilePathUtils.generateThumbnailFilePath({
              contentType:
                item.contentType === ContentTypeV2.SHOW
                  ? ContentType.SHOW
                  : ContentType.EPISODE,
              orientation: ImageOrientation.HORIZONTAL,
            });
          return {
            _id: item._id,
            contentType: item.contentType,
            createdAt: item.createdAt,
            createdBy: item.createdBy || '',
            description: item.description,
            dialect: item.dialect,
            duration: item.duration,
            format: item.format ?? ContentFormat.STANDARD,
            language: item.language,
            mediaList: item.mediaList || [],
            oldContentId: item.oldContentId,
            releaseDate:
              item.releaseDate?.toString() ?? new Date().toISOString(),
            slug: item.slug,
            status: item.status,
            thumbnailURL:
              item.allThumbnails[0][
                ImageOrientation.HORIZONTAL
              ].ratio_16_9.sourceLink.trim() !== ''
                ? await this.s3Service.generateViewSignedUrl({
                    bucket,
                    key:
                      small +
                      item.allThumbnails[0][ImageOrientation.HORIZONTAL]
                        .ratio_16_9.sourceLink,
                  })
                : '',
            title: item.title,
            transcodingProgress: 0,
            transcodingStatus: 'pending',
            updatedAt: item.updatedAt,
            updatedBy: item.updatedBy || '',
          };
        }),
      ),
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvalidContentList(): Promise<PaginatedResponse> {
    const { movies, shows } =
      await this.cmsAssetMonitoringLogRepository.getEpisodesWithMissingAssets();

    const invalidMovies = await this.contentRepository.find({
      contentType: ContentTypeV2.MOVIE,
      language: Lang.EN,
      slug: { $in: movies },
    });

    const invalidShows = await this.contentRepository.find({
      contentType: ContentTypeV2.SHOW,
      language: Lang.EN,
      slug: { $in: shows },
    });

    const invalidContents = await Promise.all([
      ...invalidMovies.map(async (movie) => ({
        _id: movie._id,
        contentType: ContentTypeV2.MOVIE,
        createdAt: movie.createdAt,
        createdBy: movie.createdBy || '',
        description: movie.description,
        dialect: movie.dialect,
        duration: movie.duration,
        errors: [],
        format: movie.format,
        language: movie.language,
        oldContentId: movie.oldContentId || 0,
        releaseDate:
          movie.releaseDate?.toISOString() || new Date().toISOString(),
        slug: movie.slug,
        status: movie.status,
        thumbnailURL: await this.generateThumbnailPreviewUrl(
          ContentTypeV2.MOVIE,
          movie.allThumbnails[0]?.[ImageOrientation.HORIZONTAL]?.ratio_16_9
            ?.sourceLink || '',
        ),
        title: movie.title,
        transcodingProgress: 0,
        transcodingStatus: 'pending',
        updatedAt: movie.updatedAt,
        updatedBy: movie.updatedBy || '',
      })),
      ...invalidShows.map(async (show) => ({
        _id: show._id,
        contentType: ContentTypeV2.SHOW,
        createdAt: show.createdAt,
        createdBy: show.createdBy || '',
        description: show.description,
        dialect: show.dialect,
        duration: show.duration,
        errors: [],
        format: show.format,
        language: show.language,
        oldContentId: show.oldContentId || 0,
        releaseDate:
          show.releaseDate?.toISOString() || new Date().toISOString(),
        slug: show.slug,
        status: show.status,
        thumbnailURL: await this.generateThumbnailPreviewUrl(
          ContentTypeV2.SHOW,
          show.allThumbnails[0]?.[ImageOrientation.HORIZONTAL]?.ratio_16_9
            ?.sourceLink || '',
        ),
        title: show.title,
        transcodingProgress: 0,
        transcodingStatus: 'pending',
        updatedAt: show.updatedAt,
        updatedBy: show.updatedBy || '',
      })),
    ]);

    return {
      items: invalidContents,
      page: 1,
      perPage: invalidContents.length,
      total: invalidContents.length,
      totalPages: 1,
    };
  }

  async getMovieDetail(
    query: { slug: string },
    ctx: Context,
  ): Promise<MovieResponseDTO> {
    const { englishMovie, hindiMovie } =
      await this.contentRepository.findMovieBySlug(
        query.slug,
        ctx.meta.dialect,
      );

    const { englishMovieEpisode } =
      await this.episodeRepository.findMovieEpisodeBySlug(
        query.slug,
        ctx.meta.dialect,
      );

    const rawMedia = ObjectId.isValid(
      englishMovieEpisode.visionularHls.rawMediaId,
    )
      ? await this.rawMediaRepository.findOne({
          _id: new ObjectId(englishMovieEpisode.visionularHls.rawMediaId),
        })
      : null;

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      englishMovie.mediaList,
      hindiMovie.mediaList,
    );

    const normalizedStatus =
      englishMovie.isComingSoon === true
        ? ContentStatus.COMING_SOON
        : englishMovie.status;

    return {
      artistList: (englishMovie.artistList ?? []).map((a: ArtistV2) => ({
        character: a.character,
        role: a.role,
        slug: a.slug,
        type: a.type,
      })),
      complianceList: englishMovie.complianceList.map((c) => c.id) ?? [],
      complianceRating: englishMovie.complianceRating,
      defaultThumbnailIndex: englishMovie.defaultThumbnailIndex || 0,
      descriptorTags: englishMovie.descriptorTags?.map((d) => d.id) ?? [],
      dialect: englishMovie.dialect,
      format: englishMovie.format,
      genreList: englishMovie.genres.map((g) => g.id) ?? [],
      gradients: englishMovie.gradients ?? [],
      moods: englishMovie.moods?.map((m) => m.id) ?? [],
      movie: {
        duration: englishMovie.duration,
        introEnd: secondsToHMS(englishMovieEpisode.introEndTime || 0),
        introStart: secondsToHMS(englishMovieEpisode.introStartTime || 0),
        meta: {
          [Lang.EN]: {
            contentId: englishMovie.contentId,
            description: englishMovie.description,
            label: englishMovie.label || '',
            slug: englishMovie.slug,
            thumbnails: englishMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: englishMovie.title,
            trailer: englishTrailers,
            upcomingScheduleText: englishMovie.upcomingScheduleText || '',
          },
          [Lang.HIN]: {
            contentId: hindiMovie.contentId,
            description: hindiMovie.description,
            label: hindiMovie.label || '',
            slug: hindiMovie.slug,
            thumbnails: hindiMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: hindiMovie.title,
            trailer: hindiTrailers,
            upcomingScheduleText: hindiMovie.upcomingScheduleText || '',
          },
        },
        subtitle: transformSubtitleToDto(englishMovieEpisode.subtitle),
      },
      plotKeywords: englishMovie.plotKeywords ?? [],
      primaryDialect: englishMovie.primaryDialect,
      rawMediaId: englishMovieEpisode.visionularHls?.rawMediaId || '',
      rawMediaLink: rawMedia?.source.url || null,
      rawMediaStatus: rawMedia?.status ?? null,
      releaseDate: englishMovie.releaseDate?.toISOString() ?? '',
      status: normalizedStatus,
      subGenreList: englishMovie.subGenres?.map((sg) => sg.id) ?? [],
      targetAudience: englishMovie.targetAudience,
      themes: englishMovie.themes?.map((t) => t.id) ?? [],
      videoFile: englishMovieEpisode.sourceLink,
    };
  }

  async getShowDetail(
    payload: { slug: string },
    ctx: Context,
  ): Promise<CombinedShowSeasonEpisodeResponseDTO> {
    const { slug } = payload;
    const dialect = ctx.meta.dialect;
    // Fetch English and Hindi show by slug
    const englishShow = await this.contentRepository.findOneOrFail({
      dialect,
      language: Lang.EN,
      slug,
    });
    const hindiShow = await this.contentRepository.findOneOrFail({
      dialect,
      language: Lang.HIN,
      slug,
    });

    // Fetch all seasons for both shows
    const englishSeasons = await this.seasonRepository.find({
      language: dialect,
      showId: englishShow.contentId,
    });
    const hindiSeasons = await this.seasonRepository.find({
      language: dialect,
      showId: hindiShow.contentId,
    });

    // For each season, fetch episodes and map to DTO
    const seasons: SeasonResponseDTO[] = englishSeasons.map((enSeason, idx) => {
      const hinSeason = hindiSeasons[idx];
      return {
        episodes: [], // We'll fill this below
        meta: {
          en: {
            _id: enSeason._id,
            description: enSeason.description,
            title: enSeason.title,
          },
          hin: {
            _id: hinSeason?._id,
            description: hinSeason?.description ?? '',
            title: hinSeason?.title ?? '',
          },
        },
      };
    });

    // Now, for each season, fetch and map episodes
    for (let i = 0; i < englishSeasons.length; i++) {
      const enSeason = englishSeasons[i];
      const hinSeason = hindiSeasons[i];
      const englishEpisodes = await this.episodeRepository.find(
        {
          seasonId: enSeason._id,
        },
        { orderBy: { episodeOrder: 'asc' } },
      );
      const hindiEpisodes = hinSeason
        ? await this.episodeRepository.find(
            { seasonId: hinSeason._id },
            { orderBy: { episodeOrder: 'asc' } },
          )
        : [];

      seasons[i].episodes = await Promise.all(
        englishEpisodes.map(async (enEp, epIdx) => {
          const hinEp = hindiEpisodes[epIdx];
          const rawMedia = (await ObjectId.isValid(
            enEp.visionularHls.rawMediaId,
          ))
            ? await this.rawMediaRepository.findOneOrFail({
                _id: new ObjectId(enEp.visionularHls.rawMediaId),
              })
            : null;
          return {
            _id: enEp._id,
            comingSoonDate: enEp.comingSoonDate || null,
            duration: enEp.duration,
            episodeOrder: enEp.episodeOrder,
            introEnd: secondsToHMS(enEp.introEndTime || 0),
            introStart: secondsToHMS(enEp.introStartTime || 0),
            isComingSoon: enEp.isComingSoon === 1,
            meta: {
              en: (await this.mapEpisodeToResponse(enEp)).meta.en,
              hin: hinEp
                ? (await this.mapEpisodeToResponse(hinEp)).meta.hin
                : (await this.mapEpisodeToResponse(enEp)).meta.en,
            },
            nextEpisodeNudge: secondsToHMS(
              calculateRemainingForNextEpisodeNudgeInSeconds(
                enEp.duration,
                enEp.nextEpisodeNudgeStartTime || 0,
              ),
            ),
            order: enEp.order,
            rawMediaId: enEp.visionularHls?.rawMediaId || '',
            rawMediaLink: rawMedia?.source.url || null,
            rawMediaStatus: rawMedia?.status || null,
            status: enEp.status,
            subtitle: transformSubtitleToDto(enEp.subtitle),
            transcodingStatus: enEp.visionularHls?.status || null,
            videoFile: enEp.sourceLink,
          };
        }),
      );
    }

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      englishShow.mediaList,
      hindiShow.mediaList,
    );

    return {
      artistList: (englishShow.artistList ?? []).map((a: ArtistV2) => ({
        character: a.character,
        role: a.role,
        slug: a.slug,
        type: a.type,
      })),
      complianceList: englishShow.complianceList?.map((c) => c.id) ?? [],
      complianceRating: englishShow.complianceRating ?? null,
      defaultThumbnailIndex: englishShow.defaultThumbnailIndex || 0,
      descriptorTags: englishShow.descriptorTags?.map((d) => d.id) ?? [],
      dialect: englishShow.dialect,
      format: englishShow.format,
      genreList: englishShow.genres?.map((g) => g.id) ?? [],
      gradients: englishShow.gradients ?? [],
      moods: englishShow.moods?.map((m) => m.id) ?? [],
      plotKeywords: englishShow.plotKeywords ?? [],
      primaryDialect: englishShow.primaryDialect ?? Dialect.HAR,
      releaseDate: englishShow.releaseDate?.toISOString() ?? '',
      show: {
        meta: {
          [Lang.EN]: {
            contentId: englishShow.contentId,
            description: englishShow.description,

            slug: englishShow.slug,
            thumbnails: englishShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: englishShow.title,
            trailer: englishTrailers,
            upcomingScheduleText: englishShow.upcomingScheduleText ?? '',
          },
          [Lang.HIN]: {
            contentId: hindiShow.contentId,
            description: hindiShow.description,

            slug: hindiShow.slug,
            thumbnails: hindiShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: hindiShow.title,
            trailer: hindiTrailers,
            upcomingScheduleText: hindiShow.upcomingScheduleText ?? '',
          },
        },
        rawMediaId: englishShow.selectedPeripheral.rawMediaId,
        seasons,
      },
      status: englishShow.status,
      subGenreList: englishShow.subGenres?.map((sg) => sg.id) ?? [],
      targetAudience: englishShow.targetAudience ?? '',
      themes: englishShow.themes?.map((t) => t.id) ?? [],
    };
  }

  async getThumbnailCtr(
    slug: string,
    contentType: ContentTypeV2,
    ctx: Context,
  ) {
    const { dialect } = ctx.meta;

    // Find the content using slug and dialect
    const { allThumbnails, slug: contentSlug } =
      await this.contentRepository.findOneOrFail({
        contentType,
        dialect,
        slug,
      });

    const thumbnailCtr = await this.thumbnailCtrRepository.find({
      _airbyte_data: { CONTENT_SLUG: contentSlug },
    });

    const allThumbnailsWithCtr: ThumbnailWithCtr[] = [];

    for (const thumbnail of allThumbnails) {
      // Initialize flat CTR structure
      const thumbnailWithCtr: ThumbnailWithCtr = {
        horizontal_16_9_ctr: 0,
        horizontal_7_2_ctr: 0,
        horizontal_tv_ctr: 0,
        square_1_1_ctr: 0,
        vertical_2_3_ctr: 0,
      };

      const calculateCtr = (sourceLink: string): number => {
        const filename = sourceLink.split('/').pop();
        if (!filename) return 0;

        const matchingCtrs = thumbnailCtr.filter((t) => {
          const ctrFilename = t._airbyte_data.THUMBNAIL_PATH.split('/').pop();
          return ctrFilename === filename;
        });

        if (matchingCtrs.length > 0) {
          return (
            matchingCtrs.reduce(
              (sum, t) => sum + (t._airbyte_data.CTR ?? 0),
              0,
            ) / matchingCtrs.length
          );
        }
        return 0;
      };

      if (thumbnail.horizontal?.ratio_16_9?.sourceLink) {
        thumbnailWithCtr.horizontal_16_9_ctr = calculateCtr(
          thumbnail.horizontal.ratio_16_9.sourceLink,
        );
      }
      if (thumbnail.horizontal?.ratio_7_2?.sourceLink) {
        thumbnailWithCtr.horizontal_7_2_ctr = calculateCtr(
          thumbnail.horizontal.ratio_7_2.sourceLink,
        );
      }
      if (thumbnail.horizontal?.ratio_tv?.sourceLink) {
        thumbnailWithCtr.horizontal_tv_ctr = calculateCtr(
          thumbnail.horizontal.ratio_tv.sourceLink,
        );
      }

      if (thumbnail.square?.ratio_1_1?.sourceLink) {
        thumbnailWithCtr.square_1_1_ctr = calculateCtr(
          thumbnail.square.ratio_1_1.sourceLink,
        );
      }

      if (thumbnail.vertical?.ratio_2_3?.sourceLink) {
        thumbnailWithCtr.vertical_2_3_ctr = calculateCtr(
          thumbnail.vertical.ratio_2_3.sourceLink,
        );
      }

      allThumbnailsWithCtr.push(thumbnailWithCtr);
    }

    return { thumbnails: allThumbnailsWithCtr };
  }

  //handle transcode mp4 callback
  public async handleUpdateEpisodeDurationFromMediaConvert({
    durationInMs,
    url,
  }: {
    url: string;
    durationInMs: number;
  }): Promise<void> {
    const { nameWithExtension: sourceLink } =
      MediaFilePathUtils.extractFileNameWithExtension(url);
    const episodes = await this.episodeRepository.find({
      sourceLink,
    });

    if (episodes.length === 0) {
      throw new NotFoundException('Episode not found');
    }

    await Promise.all(
      episodes.map((episode) => {
        episode.duration = Math.round(durationInMs / 1000);
        return this.episodeRepository.save(episode);
      }),
    );
  }

  // async removeEpisodeFromQueue({
  //   contentType,
  //   dialect,
  //   format,
  //   slug,
  // }: {
  //   slug: string;
  //   dialect: Dialect;
  //   contentType: ContentTypeV2;
  //   format: ContentFormat;
  // }): Promise<void> {
  //   // await this.cmsQueueDispatcher.removeEpisodeJob({
  //   //   contentType,
  //   //   dialect,
  //   //   format,
  //   //   slug,
  //   // });
  // }

  @Transactional()
  public async publishContent(payload: {
    slug: string;
    status: ContentStatus.ACTIVE | ContentStatus.PREVIEW_PUBLISHED;
    resetUserContentMetadata?: boolean;
    ctx: Context;
  }) {
    const { ctx, resetUserContentMetadata = false, slug, status } = payload;

    // Validate and map statuses
    const statusMap = {
      [ContentStatus.ACTIVE]: {
        content: ContentStatus.ACTIVE,
        episode: EpisodeStatus.ACTIVE,
        season: SeasonStatus.ACTIVE,
        show: ShowStatus.ACTIVE,
      },
      [ContentStatus.PREVIEW_PUBLISHED]: {
        content: ContentStatus.PREVIEW_PUBLISHED,
        episode: EpisodeStatus.PREVIEW_PUBLISHED,
        season: SeasonStatus.PREVIEW_PUBLISHED,
        show: ShowStatus.PREVIEW_PUBLISH,
      },
    };
    const mappedStatus = this.errorHandler.raiseErrorIfNull(
      statusMap[status],
      new NotFoundException('Invalid publish status'),
    );

    const {
      content: contentStatus,
      episode: episodeStatus,
      season: seasonStatus,
      show: showStatus,
    } = mappedStatus;

    // Fetch and validate primary content
    const contents = await this.contentRepository.find({
      dialect: ctx.meta.dialect,
      slug,
    });

    if (contents.length === 0) throw new NotFoundException('Content not found');

    contents.forEach(validateContentForPublishing);
    const content = contents[0];
    const oldStatus = content.status;

    if (
      content.contentType === ContentTypeV2.MOVIE ||
      content.contentType === ContentTypeV2.SHOW
    ) {
      const durationValidation =
        await this.validateAndUpdateAllEpisodesDuration(
          slug,
          content.contentType,
        );

      if (!durationValidation.isValid) {
        throw new BadRequestException(
          `Cannot publish content: ${durationValidation.error}`,
        );
      }
    }

    const upsertPromises: Promise<unknown>[] = [];

    // Handle MOVIE content type
    if (content.contentType === ContentTypeV2.MOVIE) {
      const episodes = await this.episodeRepository.find({
        language: ctx.meta.dialect,
        slug,
      });
      episodes.forEach(validateMovieForPublishing);

      // Process episode videos
      await Promise.all(
        episodes.map(async (episode) => {
          const videoSizes = await this.fileManager.fetchMp4FileSizes({
            contentType: ContentType.EPISODE,
            sourceLink: episode.sourceLink,
          });

          episode.videoFormatDetail = [240, 360, 480, 720, 1080].map((res) => ({
            bitRate: res,
            label: `${res}px`,
            size: videoSizes[res as MP4Resolution],
          }));
        }),
      );

      upsertPromises.push(
        this.contentRepository.upsertMany(
          contents.map((c) => ({
            ...c,
            duration: episodes[0].duration, //because type is move  take duration from first episode
            status: contentStatus,
          })),
        ),
      );
      upsertPromises.push(
        Promise.all(
          episodes.map((episode) => {
            episode.englishValidated = true;
            episode.hindiValidated = true;
            if (status === ContentStatus.ACTIVE) {
              episode.isComingSoon = 0;
            }
            episode.nextEpisodeNudgeStartTime =
              calculateNextEpisodeNudgeStartTime(
                episode.duration,
                episode.nextEpisodeNudgeStartTime,
              );
            episode.publishCount = episode.publishCount + 1;
            episode.status = episodeStatus;
            return this.episodeRepository.save(episode);
          }),
        ),
      );
    }
    // Handle SHOW content type
    else if (content.contentType === ContentTypeV2.SHOW) {
      const shows = await this.legacyShowRepository.find({
        language: ctx.meta.dialect,
        slug,
      });
      if (!shows.length) throw new NotFoundException('Content not found');

      const seasons = await this.seasonRepository.find({
        language: ctx.meta.dialect,
        showSlug: slug,
      });
      seasons.forEach(validateSeasonForPublishing);

      const seasonSlug = seasons[0]?.slug;
      if (!seasonSlug) throw new Error('Season not found');

      const episodes = await this.episodeRepository.find({
        language: ctx.meta.dialect,
        seasonSlug,
        showSlug: slug,
        status: { $ne: EpisodeStatus.COMING_SOON },
      });

      if (!episodes.length) throw new Error('At least one episode is required');

      episodes.forEach((episode) => {
        const selectedPeripheral = episode.mediaList.find(
          (item) => item.selectedPeripheralStatus === true,
        );
        if (!selectedPeripheral) return;
        episode.selectedPeripheral = {
          ...selectedPeripheral,
          type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
        };
      });
      episodes.forEach((episode) => {
        const previousEpisode = episodes.find(
          (e) => e.episodeOrder === episode.episodeOrder - 1,
        );
        if (
          previousEpisode &&
          previousEpisode.episodeOrder !== episode.episodeOrder - 1
        ) {
          throw new Error(
            'The episodes are not in order or the previous episode is scheduled for release.Please add a release date for this episode',
          );
        }
        validateEpisodeForPublishing(episode, shows[0].format);
      });

      const totalEpisodeDuration = episodes
        .filter((episode) => episode.language === shows[0].language)
        .reduce((acc, episode) => acc + episode.duration, 0);

      shows.forEach((s) => {
        const selectedPeripheral = s.mediaList.find(
          (item) => item.selectedPeripheralStatus === true,
        );
        if (!selectedPeripheral) return;
        s.selectedPeripheral = selectedPeripheral;
        s.duration = totalEpisodeDuration;
      });

      upsertPromises.push(
        this.contentRepository.upsertMany(
          contents.map((c) => ({
            ...c,
            duration: totalEpisodeDuration,
            status: contentStatus,
          })),
        ),
      );
      await Promise.all(shows.map(validateShowForPublishing));

      // Process episode videos (same as movie processing)
      await Promise.all(
        episodes.map(async (episode) => {
          const videoSizes = await this.fileManager.fetchMp4FileSizes({
            contentType: ContentType.EPISODE,
            sourceLink: episode.sourceLink,
          });

          episode.videoFormatDetail = [240, 360, 480, 720, 1080].map((res) => ({
            bitRate: res,
            label: `${res}px`,
            size: videoSizes[res as MP4Resolution],
          }));
        }),
      );

      upsertPromises.push(
        this.legacyShowRepository.upsertMany(
          shows.map((show) => ({
            ...show,
            englishValidated: true,
            hindiValidated: true,
            ...(status === ContentStatus.ACTIVE && { isComingSoon: false }),
            publishCount: show.publishCount + 1,
            status: showStatus,
          })),
        ),
        this.seasonRepository.upsertMany(
          seasons.map((season) => ({
            ...season,
            englishValidated: true,
            hindiValidated: true,
            ...(status === ContentStatus.ACTIVE && { isComingSoon: false }),
            status: seasonStatus,
          })),
        ),
        Promise.all(
          episodes.map((episode) => {
            episode.complianceList = episode.complianceList || [];
            episode.englishValidated = true;
            episode.hindiValidated = true;
            if (status === ContentStatus.ACTIVE) {
              episode.isComingSoon = 0;
            }
            episode.publishCount = episode.publishCount + 1;
            episode.status = episodeStatus;
            episode.nextEpisodeNudgeStartTime =
              calculateNextEpisodeNudgeStartTime(
                episode.duration,
                episode.nextEpisodeNudgeStartTime,
              );
            return this.episodeRepository.save(episode);
          }),
        ),
      );
    }

    // Final common step
    if (status === ContentStatus.ACTIVE) {
      upsertPromises.push(this.comingSoonService.completeComingSoon(slug));
    }
    if (
      resetUserContentMetadata &&
      !(status === ContentStatus.ACTIVE && oldStatus === ContentStatus.ACTIVE)
    ) {
      this.contentCensorService.resetPreviewContent(
        content.dialect,
        slug,
        content.contentType,
      );
    }
    if (status === ContentStatus.ACTIVE) {
      this.contentCensorService.removePreviewContent(
        content.dialect,
        slug,
        content.contentType,
      );
    }

    await Promise.all(upsertPromises);

    if (status === ContentStatus.ACTIVE) {
      await this.updateGenresAndSubgenreStatus();
    }
  }

  public async publishEpisode(payload: {
    slug: string;
    dialect: Dialect;
    contentType: ContentTypeV2;
    format: ContentFormat;
  }) {
    const { dialect, format, slug } = payload;

    const episodes = this.errorHandler.raiseErrorIfNull(
      await this.episodeRepository.find({
        format,
        language: dialect,
        slug,
        type: EpisodeType.SEASON,
      }),
      Errors.EPISODE.NOT_FOUND('Episodes not found'),
    );

    //check if previous episode is active
    await this.episodeRepository.findOneOrFail({
      episodeOrder: episodes[0].episodeOrder - 1,
      format,
      language: dialect,
      showSlug: episodes[0].showSlug,
      status: EpisodeStatus.ACTIVE,
      type: EpisodeType.SEASON,
    });

    this.validateEpisodeCountPerLanguage(episodes);

    episodes.forEach((episode) => {
      validateEpisodeForPublishing(episode, format);
    });

    await Promise.all(
      episodes.map((episode) => {
        episode.status = EpisodeStatus.ACTIVE;
        episode.isComingSoon = 0;
        episode.nextEpisodeNudgeStartTime = calculateNextEpisodeNudgeStartTime(
          episode.duration,
          episode.nextEpisodeNudgeStartTime,
        );
        episode.releaseDate = episode.comingSoonDate;
        return this.episodeRepository.save(episode);
      }),
    );
  }

  async publishPendingEpisodes() {
    const episodes = await this.episodeRepository.find({
      comingSoonDate: { $lte: new Date() },
      status: EpisodeStatus.COMING_SOON,
    });
    const showSlugs = new Set<string>();
    episodes.forEach(async (episode) => {
      showSlugs.add(episode.showSlug);
      await this.publishEpisode({
        contentType:
          episode.type === EpisodeType.SEASON
            ? ContentTypeV2.SHOW
            : ContentTypeV2.MOVIE,
        dialect: episode.language,
        format: episode.format,
        slug: episode.slug,
      });
    });
    await Promise.all(
      Array.from(showSlugs).map((showSlug) =>
        this.updateShowDuration(showSlug),
      ),
    );
  }

  async removeEpisodeFromScheduledRelease({
    dialect,
    format,
    slug,
  }: {
    slug: string;
    dialect: Dialect;
    contentType: ContentTypeV2;
    format: ContentFormat;
  }): Promise<void> {
    const episodes = await this.episodeRepository.find({
      format,
      language: dialect,
      slug,
      type: EpisodeType.SEASON,
    });

    this.validateEpisodeCountPerLanguage(episodes);

    episodes.forEach((episode) => {
      episode.status = EpisodeStatus.DRAFT;
      episode.isComingSoon = 0;
    });

    await Promise.all(
      episodes.map((episode) => this.episodeRepository.save(episode)),
    );

    // await this.removeEpisodeFromQueue({
    //   contentType,
    //   dialect,
    //   format,
    //   slug,
    // });

    this.cleanupExpiredShowLabels();
  }

  @Transactional()
  async scheduleEpisodeForRelease({
    dialect,
    format,
    scheduledDate,
    slug,
  }: ScheduleEpisodeDTO): Promise<void> {
    const episodes = await this.episodeRepository.find({
      format,
      language: dialect,
      slug,
      type: EpisodeType.SEASON,
    });

    this.validateEpisodeCountPerLanguage(episodes);

    episodes.forEach((episode) => {
      episode.comingSoonDate = scheduledDate;
      episode.status = EpisodeStatus.COMING_SOON;
      episode.isComingSoon = 1;
    });

    await Promise.all(
      episodes.map((episode) => this.episodeRepository.save(episode)),
    );

    // await this.addEpisodeToQueue({
    //   key: CMSQueueKeys.EPISODE_SCHEDULING,
    //   payload: {
    //     contentType,
    //     dialect,
    //     format,
    //     scheduledDate,
    //     slug,
    //   },
    // });

    await this.addLabelTextToShow(episodes[0].showSlug, dialect);
  }

  // @Transactional()
  async unpublishContent(slug: string, ctx: Context) {
    const content = await this.contentRepository.findOneOrFail({
      dialect: ctx.meta.dialect,
      slug,
    });

    this.contentCensorService.resetPreviewContent(
      content.dialect,
      slug,
      content.contentType,
    );

    return Promise.all([
      this.legacyShowRepository.nativeUpdate(
        { language: ctx.meta.dialect, slug: slug },
        { status: ShowStatus.DRAFT },
      ),
      this.contentRepository.nativeUpdate(
        { dialect: ctx.meta.dialect, slug: slug },
        { status: ContentStatus.DRAFT },
      ),
      this.seasonRepository.nativeUpdate(
        { language: ctx.meta.dialect, showSlug: slug },
        { status: SeasonStatus.DRAFT },
      ),
      this.episodeRepository.nativeUpdate(
        {
          $or: [{ showSlug: slug }, { slug: slug }],
          language: ctx.meta.dialect,
        },
        { status: EpisodeStatus.DRAFT },
      ),
      this.comingSoonService.completeComingSoon(slug),
      this.reelService.unpublishReelsByContentSlug(slug),
      this.platterService.removeContentFromPlatters(slug),
    ]);
  }

  @Transactional()
  async updateMovie(
    payload: CreateOrUpdateMovieDTO,
    ctx: Context,
  ): Promise<MovieResponseDTO> {
    const {
      artistList,
      complianceList,
      complianceRating,
      defaultThumbnailIndex = 0,
      descriptorTags,
      genreList,
      gradients,
      moods,
      movie,
      plotKeywords,
      primaryDialect,
      rawMediaId,
      releaseDate,
      subGenreList,
      targetAudience,
      themes,
    } = payload;

    const userDetails = await this.cmsUserRepository.findOneOrFail({
      _id: new ObjectId(ctx.user.id),
    });

    if (isNaN(new Date(releaseDate).getTime())) {
      throw new Error('Invalid release date');
    }

    const [
      genres = [],
      subGenres = [],
      complianceItems = [],
      moodItems = [],
      themeItems = [],
      descriptorTagItems = [],
      englishMovieContent,
      hindiMovieContent,
      artistsRaw = [],
      existingHindiIndividualMovie,
      existingEnglishIndividualMovie,
    ] = await Promise.all([
      (await this.genreRepository.find({ _id: { $in: genreList } })).sort(
        (a, b) =>
          (genreList as number[]).indexOf(a._id) -
          (genreList as number[]).indexOf(b._id),
      ),
      this.subGenreRepository.find({ _id: { $in: subGenreList } }),
      this.complianceRepository.find({ _id: { $in: complianceList } }),
      this.moodRepository.find({ _id: { $in: moods } }),
      this.themeRepository.find({ _id: { $in: themes } }),
      this.descriptorTagRepository.find({
        _id: { $in: descriptorTags },
      }),
      this.contentRepository.findOneOrFail({
        contentType: ContentTypeV2.MOVIE,
        dialect: ctx.meta.dialect,
        language: Lang.EN,
        slug: movie.meta.en.slug,
      }),
      this.contentRepository.findOneOrFail({
        contentType: ContentTypeV2.MOVIE,
        dialect: ctx.meta.dialect,
        language: Lang.HIN,
        slug: movie.meta.hin.slug,
      }),
      this.ArtistRepositoryV2.find({
        slug: { $in: artistList.map((a) => a.slug) },
      }),
      this.episodeRepository.findOneOrFail({
        displayLanguage: Lang.EN,
        language: ctx.meta.dialect,
        slug: movie.meta.en.slug,
      }),
      this.episodeRepository.findOneOrFail({
        displayLanguage: Lang.HIN,
        language: ctx.meta.dialect,
        slug: movie.meta.hin.slug,
      }),
    ]);

    const enrichedArtists = enrichArtistData(artistsRaw, artistList);

    const { en: englishMeta, hin: hindiMeta } = movie.meta;

    const hinMediaList = processMediaItemDtoToMediaList(
      hindiMeta.trailer,
      hindiMovieContent.mediaList,
    );

    const enMediaList = processMediaItemDtoToMediaList(
      englishMeta.trailer,
      englishMovieContent.mediaList,
    );
    //Remove this hardcoded enThumbnail and hinThumbnail in later PR's as discussed (map using obj keys)
    const enThumbnails = payload.movie.meta.en.thumbnails.map(
      (thumbnail, index) =>
        convertShowThumbnailToContentThumbnail(
          convertThumbnailDTOToShowThumbnail(thumbnail, index),
        ),
    );

    const hinThumbnails = payload.movie.meta.hin.thumbnails.map(
      (thumbnail, index) =>
        convertShowThumbnailToContentThumbnail(
          convertThumbnailDTOToShowThumbnail(thumbnail, index),
        ),
    );
    if (englishMovieContent.status === ContentStatus.ACTIVE) {
      enThumbnails.forEach((thumbnail) => {
        validateContentThumbnailForPublishing(thumbnail);
      });
      hinThumbnails.forEach((thumbnail) => {
        validateContentThumbnailForPublishing(thumbnail);
      });
    }
    // Update English and Hindi movies
    const [updatedEnglishMovie, updatedHindiMovie] = await Promise.all([
      this.contentRepository.updateMovie({
        language: Lang.EN,
        payload: {
          allThumbnails: enThumbnails,
          artistList: enrichedArtists,
          complianceList: complianceItems.map((compliance) => ({
            id: compliance._id,
            name: compliance.name,
          })),
          complianceRating,
          defaultThumbnailIndex: defaultThumbnailIndex,
          description: movie.meta.en.description,
          descriptorTags: descriptorTagItems.map((dt) => ({
            id: dt._id,
            name: dt.name,
          })),
          genres: genres.map((genre) => ({
            id: genre._id,
            name: genre.name,
          })),
          gradients,
          mediaList: enMediaList,
          metaDescription: movie.meta.en.description,
          moods: moodItems.map((mood) => ({
            id: mood._id,
            name: mood.name,
          })),
          plotKeywords,
          primaryDialect,
          releaseDate: new Date(releaseDate),
          selectedPeripheral:
            enMediaList.find((p) => p.selectedPeripheralStatus === true) ??
            enMediaList[0], // fallback to first item if no selectedPeripheralStatus is true
          subGenres: subGenres.map((subGenre) => ({
            id: subGenre._id,
            name: subGenre.name,
          })),
          targetAudience,
          themes: themeItems.map((theme) => ({
            id: theme._id,
            name: theme.name,
          })),
          thumbnail: enThumbnails[defaultThumbnailIndex],
          title: movie.meta.en.title,
          upcomingScheduleText: movie.meta.en.upcomingScheduleText || '',
          updatedBy: userDetails.getFullName(),
        },
        slug: movie.meta.en.slug,
      }),

      this.contentRepository.updateMovie({
        language: Lang.HIN,
        payload: {
          allThumbnails: hinThumbnails,
          artistList: enrichedArtists,
          complianceList: complianceItems.map((compliance) => ({
            id: compliance._id,
            name: compliance.name,
          })),
          complianceRating,
          defaultThumbnailIndex: defaultThumbnailIndex,
          description: movie.meta.hin.description,
          descriptorTags: descriptorTagItems.map((dt) => ({
            id: dt._id,
            name: dt.hindiName,
          })),
          genres: genres.map((genre) => ({
            id: genre._id,
            name: genre.hindiName,
          })),
          gradients,
          mediaList: hinMediaList,
          metaDescription: movie.meta.hin.description,
          moods: moodItems.map((mood) => ({
            id: mood._id,
            name: mood.hindiName,
          })),
          plotKeywords,
          primaryDialect,
          releaseDate: new Date(releaseDate),
          selectedPeripheral:
            hinMediaList.find((p) => p.selectedPeripheralStatus === true) ??
            hinMediaList[0], // fallback to first item if no selectedPeripheralStatus is true
          subGenres: subGenres.map((subGenre) => ({
            id: subGenre._id,
            name: subGenre.hinName,
          })),
          targetAudience,
          themes: themeItems.map((theme) => ({
            id: theme._id,
            name: theme.hindiName,
          })),
          thumbnail: convertShowThumbnailToContentThumbnail(
            convertThumbnailDTOToShowThumbnail(
              hindiMeta.thumbnails[defaultThumbnailIndex],
              defaultThumbnailIndex,
            ),
          ),
          title: movie.meta.hin.title,
          upcomingScheduleText: movie.meta.hin.upcomingScheduleText || '',
          updatedBy: userDetails.getFullName(),
        },
        slug: movie.meta.hin.slug,
      }),
    ]);

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      updatedEnglishMovie.mediaList,
      updatedHindiMovie.mediaList,
    );

    // Update English and Hindi episodes
    const [updatedEnglishEpisode] = await Promise.all([
      this.episodeRepository.updateMovieEpisode({
        dialect: ctx.meta.dialect,
        language: Lang.EN,
        payload: {
          allThumbnails: englishMovieContent.allThumbnails.map(
            convertContentThumbnailToShowThumbnail,
          ),
          artistList: convertArtistsToLegacyFormat(
            hindiMovieContent.artistList,
            Lang.EN,
          ),
          complianceList: updatedEnglishMovie.complianceList,
          complianceRating: updatedEnglishMovie.complianceRating ?? undefined,
          defaultThumbnailIndex: updatedEnglishMovie.defaultThumbnailIndex,
          description: updatedEnglishMovie.description,
          descriptorTags: updatedEnglishMovie.descriptorTags,
          genreList: updatedEnglishMovie.genres,
          introEndTime: this.calculateTimeSpanInSeconds(movie.introEnd),
          introStartTime: this.calculateTimeSpanInSeconds(movie.introStart),

          mediaList: updatedEnglishMovie.mediaList,
          moods: updatedEnglishMovie.moods,
          nextEpisodeNudgeStartTime: 0,
          preContentWarningText:
            existingEnglishIndividualMovie.preContentWarningText ?? '',
          selectedPeripheral: {
            ...updatedEnglishMovie.selectedPeripheral,
            type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
          },
          subGenreList: englishMovieContent.subGenres,
          subtitle: updateSubtitleMetadataOnChanges({
            currentSubtitle: existingEnglishIndividualMovie.subtitle,
            localUpload: !!movie.subtitle?.enMetadata,
            newEnFile: movie.subtitle?.en,
            newHinFile: movie.subtitle?.hin,
          }),
          tags: englishMovieContent.plotKeywords.join(', '),
          themes: englishMovieContent.themes,
          thumbnail: convertContentThumbnailToShowThumbnail(
            updatedEnglishMovie.allThumbnails[defaultThumbnailIndex],
          ),
          title: updatedEnglishMovie.title,
          upcomingScheduleText: updatedEnglishMovie.upcomingScheduleText || '',
          visionularHls: {
            ...existingEnglishIndividualMovie.visionularHls,
            rawMediaId: rawMediaId,
          },
          visionularHlsH265: {
            ...existingEnglishIndividualMovie.visionularHlsH265,
            rawMediaId: rawMediaId,
          },
        },
        slug: movie.meta.en.slug,
      }),
      this.episodeRepository.updateMovieEpisode({
        dialect: ctx.meta.dialect,
        language: Lang.HIN,
        payload: {
          allThumbnails: hindiMovieContent.allThumbnails.map(
            convertContentThumbnailToShowThumbnail,
          ),
          artistList: convertArtistsToLegacyFormat(
            hindiMovieContent.artistList,
            Lang.HIN,
          ),
          complianceList: updatedHindiMovie.complianceList,
          complianceRating: updatedHindiMovie.complianceRating ?? undefined,
          defaultThumbnailIndex: updatedHindiMovie.defaultThumbnailIndex,
          description: updatedHindiMovie.description,
          descriptorTags: updatedHindiMovie.descriptorTags,
          genreList: updatedHindiMovie.genres,
          introEndTime: this.calculateTimeSpanInSeconds(movie.introEnd),
          introStartTime: this.calculateTimeSpanInSeconds(movie.introStart),

          mediaList: updatedHindiMovie.mediaList,
          moods: updatedHindiMovie.moods,
          nextEpisodeNudgeStartTime: 0,
          preContentWarningText:
            existingHindiIndividualMovie.preContentWarningText ?? '',
          selectedPeripheral: {
            ...updatedHindiMovie.selectedPeripheral,
            type: PeripheralTypeEnum.EPISODE_PERIPHERAL,
          },
          subGenreList: updatedHindiMovie.subGenres,
          subtitle: updateSubtitleMetadataOnChanges({
            currentSubtitle: existingHindiIndividualMovie.subtitle,
            localUpload: !!movie.subtitle?.hinMetadata,
            newEnFile: movie.subtitle?.en,
            newHinFile: movie.subtitle?.hin,
          }),
          tags: englishMovieContent.plotKeywords.join(', '),
          themes: hindiMovieContent.themes,
          thumbnail: convertContentThumbnailToShowThumbnail(
            updatedHindiMovie.allThumbnails[
              updatedHindiMovie.defaultThumbnailIndex
            ],
          ),
          title: updatedHindiMovie.title,
          upcomingScheduleText: updatedHindiMovie.upcomingScheduleText || '',
          visionularHls: {
            ...existingEnglishIndividualMovie.visionularHls,
            rawMediaId,
          },
          visionularHlsH265: {
            ...existingHindiIndividualMovie.visionularHlsH265,
            rawMediaId,
          },
        },
        slug: movie.meta.hin.slug,
      }),
    ]);

    const rawMedia = ObjectId.isValid(
      updatedEnglishEpisode.visionularHls.rawMediaId,
    )
      ? await this.rawMediaRepository.findOne({
          _id: new ObjectId(updatedEnglishEpisode.visionularHls.rawMediaId),
        })
      : null;

    return {
      artistList: artistList,
      complianceList: complianceList,
      complianceRating,
      descriptorTags,
      dialect: updatedEnglishMovie.dialect,
      format: updatedEnglishMovie.format,
      genreList,
      gradients,
      moods,
      movie: {
        duration: updatedEnglishMovie.duration,
        introEnd: secondsToHMS(updatedEnglishEpisode.introEndTime ?? 0),
        introStart: secondsToHMS(updatedEnglishEpisode.introStartTime ?? 0),
        meta: {
          [Lang.EN]: {
            contentId: updatedEnglishMovie.contentId,
            description: updatedEnglishMovie.description,
            label: updatedEnglishMovie.label || '',
            slug: updatedEnglishMovie.slug,
            thumbnails: updatedEnglishMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: updatedEnglishMovie.title,
            trailer: englishTrailers,
            upcomingScheduleText:
              updatedEnglishMovie.upcomingScheduleText || '',
          },
          [Lang.HIN]: {
            contentId: updatedHindiMovie.contentId,
            description: updatedHindiMovie.description,
            label: updatedHindiMovie.label || '',
            slug: updatedHindiMovie.slug,
            thumbnails: updatedHindiMovie.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: updatedHindiMovie.title,
            trailer: hindiTrailers,
            upcomingScheduleText: updatedHindiMovie.upcomingScheduleText || '',
          },
        },
        subtitle: transformSubtitleFromDto(updatedEnglishEpisode.subtitle),
      },
      plotKeywords,
      primaryDialect,
      rawMediaId: updatedEnglishEpisode.visionularHls?.rawMediaId ?? '',
      rawMediaLink: rawMedia?.source.url || null,
      rawMediaStatus: rawMedia?.status || null,
      releaseDate: updatedEnglishMovie.releaseDate?.toISOString() ?? '',
      status: updatedEnglishMovie.status,
      subGenreList,
      targetAudience,
      themes,
      videoFile: updatedEnglishEpisode.sourceLink,
    };
  }

  async updateRawMediaMp4Status(
    url: string,
    jobId: string,
    status: TaskStatusEnum,
  ) {
    const { nameWithExtension: sourceLink } =
      MediaFilePathUtils.extractFileNameWithExtension(url);
    const episode = await this.episodeRepository.findOne({
      sourceLink,
    });

    if (!episode) {
      throw new Error('Episode not found');
    }

    const rawMedia = await this.rawMediaRepository.findOneOrFail({
      _id: new ObjectId(episode.visionularHls.rawMediaId),
    });

    const task = rawMedia.transcodingTask.find(
      (task) => task.externalTaskId === jobId,
    );
    if (!task) {
      throw new Error('Task not found');
    }
    task.taskStatus = status;
    await this.rawMediaRepository.save(rawMedia);
  }

  @Transactional()
  async updateShow(
    payload: UpdateShowDTO,
    ctx: Context,
  ): Promise<CombinedShowSeasonEpisodeResponseDTO> {
    const { defaultThumbnailIndex = 0, show } = payload;
    const enContentId = this.errorHandler.raiseErrorIfNull(
      show.meta.en.contentId,
      new Error('contentId not found'),
    );
    const hinContentId = this.errorHandler.raiseErrorIfNull(
      show.meta.hin.contentId,
      new Error('contentId not found'),
    );

    const legacyShows = await this.legacyShowRepository.find({
      _id: { $in: [enContentId, hinContentId] },
    });

    const legacyEnglishShow = this.errorHandler.raiseErrorIfNull(
      legacyShows.find((show) => show._id === enContentId),
      new Error('Show not found in legacyShows'),
    );

    const legacyHindiShow = this.errorHandler.raiseErrorIfNull(
      legacyShows.find((show) => show._id === hinContentId),
      new Error('Show not found in legacyShows'),
    );

    // Get seasons from the array
    const seasons = show.seasons;
    const userDetails = await this.cmsUserRepository.findOneOrFail({
      _id: new ObjectId(ctx.user.id),
    });
    // Calculate total episode count across all seasons
    const totalEpisodeCount = seasons.reduce(
      (sum, season) => sum + (season.episodes?.length || 0),
      0,
    );

    // Find existing shows and update them
    const { existingEnglishShow, existingHindiShow } =
      await this.updateShowEntities({
        payload,
        totalEpisodeCount,
        userDetails,
      });

    const { englishTrailers, hindiTrailers } = await this.getTrailers(
      existingEnglishShow.mediaList,
      existingHindiShow.mediaList,
    );

    const contentSlug = existingEnglishShow.slug;

    const enGenreList = existingEnglishShow.genres;
    const hinGenreList = existingHindiShow.genres;
    // Process each season
    const result = this.initializeResultObject({
      existingEnglishShow,
      existingHindiShow,
    });

    // Process seasons from updated DTO
    for (const season of seasons) {
      const enSeasonMeta = season.meta.en;
      const hinSeasonMeta = season.meta.hin;

      // Get IDs of episodes in payload
      const enEpisodeIds = season.episodes
        .map((ep) => ep.meta.en._id)
        .filter((id): id is number => id !== undefined);
      const hinEpisodeIds = season.episodes
        .map((ep) => ep.meta.hin._id)
        .filter((id): id is number => id !== undefined);

      const { englishSeason, hindiSeason } = await this.updateOrCreateSeasons({
        contentSlug,
        dialect: ctx.meta.dialect,
        enSeasonMeta,
        episodeCount: enEpisodeIds.length,
        existingEnglishShow,
        existingHindiShow,
        gradients: payload.gradients,
        hinSeasonMeta,
      });

      result.en.seasons.push(englishSeason);
      result.hin.seasons.push(hindiSeason);

      // Delete episodes not in payload
      await this.episodeRepository.deleteEpisodesNotInPayload({
        enEpisodeIds,
        enSeasonId: englishSeason._id,
        enShowId: enContentId,
        hinEpisodeIds,
        hinSeasonId: hindiSeason._id,
        hinShowId: hinContentId,
      });

      // Then, process episodes from payload
      for (let idx = 0; idx < season.episodes.length; idx++) {
        const episode = season.episodes[idx];
        episode.order = idx + 1;
        const enEpisodeMeta = episode.meta.en;
        const hinEpisodeMeta = episode.meta.hin;

        if (enEpisodeMeta._id && hinEpisodeMeta._id) {
          // Update existing episodes
          this.validateEpisodeTitle(payload.format, enEpisodeMeta.title);

          const { englishEpisode, hindiEpisode } =
            await this.episodeRepository.updateEpisodes({
              enArtistList: convertArtistsToLegacyFormat(
                existingEnglishShow.artistList,
                Lang.EN,
              ),
              enContentId,
              enGenreList,
              englishEpisodeId: enEpisodeMeta._id,
              enSeason: englishSeason,
              enShow: legacyEnglishShow,
              epData: episode,
              episodeOrder: idx + 1,
              hinArtistList: convertArtistsToLegacyFormat(
                existingHindiShow.artistList,
                Lang.HIN,
              ),
              hinContentId,
              hindiEpisodeId: hinEpisodeMeta._id,
              hinEpData: episode,
              hinGenreList,
              hinSeason: hindiSeason,
              hinShow: legacyHindiShow,
            });

          result.en.episodes.push(englishEpisode);
          result.hin.episodes.push(hindiEpisode);
        } else {
          // Create new episodes

          const { englishEpisodes, hindiEpisodes } =
            await this.episodeRepository.createEpisodesFromSeasons({
              defaultThumbnailIndex: defaultThumbnailIndex,
              dialect: ctx.meta.dialect,
              englishGenres: existingEnglishShow.genres,
              englishSeasonId: englishSeason._id,
              englishShowId: existingEnglishShow.contentId,
              englishSubGenres: existingEnglishShow.subGenres,
              epData: episode,
              episodeOrder: idx + 1,
              format: payload.format,
              hindiGenres: existingHindiShow.genres,
              hindiSeasonId: hindiSeason._id,
              hindiShowId: existingHindiShow.contentId,
              hindiSubGenres: existingHindiShow.subGenres,
              hinEpData: episode,
              seasonSlug: englishSeason.slug,
              showSlug: contentSlug,
            });

          result.en.episodes.push(...englishEpisodes);
          result.hin.episodes.push(...hindiEpisodes);
        }
      }

      // Update the season's episode count
      englishSeason.episodeCount = season.episodes.length;
      hindiSeason.episodeCount = season.episodes.length;

      await this.seasonRepository.save(englishSeason);
      await this.seasonRepository.save(hindiSeason);
    }

    await this.validateAndUpdateAllEpisodesDuration(
      contentSlug,
      ContentTypeV2.SHOW,
    );

    // At the end of updateShow, return the response in the same format as createShow
    const responseSeasons = await Promise.all(
      result.en.seasons.map(async (enSeason: Seasons, idx: number) => {
        const hinSeason = result.hin.seasons[idx];
        const enSeasonEpisodes = result.en.episodes.filter(
          (ep: Episode) => ep.seasonId === enSeason._id,
        );
        const hinSeasonEpisodes = result.hin.episodes.filter(
          (ep: Episode) => ep.seasonId === hinSeason._id,
        );
        return {
          episodes: await Promise.all(
            enSeasonEpisodes.map(async (enEp: Episode, epIdx: number) => {
              const hinEp = hinSeasonEpisodes[epIdx];
              const rawMedia = await this.rawMediaRepository.findOne({
                _id: enEp.visionularHls.rawMediaId,
              });
              return {
                _id: enEp._id,
                comingSoonDate: enEp.comingSoonDate || null,
                duration: enEp.duration,
                episodeOrder: enEp.episodeOrder,
                introEnd: secondsToHMS(enEp.introEndTime || 0),
                introStart: secondsToHMS(enEp.introStartTime || 0),
                isComingSoon: enEp.isComingSoon === 1,
                meta: {
                  en: (await this.mapEpisodeToResponse(enEp)).meta.en,
                  hin: (await this.mapEpisodeToResponse(hinEp)).meta.hin,
                },
                nextEpisodeNudge: secondsToHMS(
                  enEp.nextEpisodeNudgeStartTime || 0,
                ),
                order: enEp.order,
                rawMediaId: enEp.visionularHls?.rawMediaId ?? '',
                rawMediaLink: rawMedia?.source.url ?? null,
                rawMediaStatus: rawMedia?.status ?? null,
                status: enEp.status,
                subtitle: transformSubtitleToDto(enEp.subtitle),
                transcodingStatus: enEp.visionularHls?.status ?? null,
                videoFile: enEp.sourceLink,
              };
            }),
          ),
          meta: {
            en: {
              _id: enSeason._id,
              description: enSeason.description,
              title: enSeason.title,
            },
            hin: {
              _id: hinSeason._id,
              description: hinSeason.description,
              title: hinSeason.title,
            },
          },
        };
      }),
    );

    return {
      artistList: (existingEnglishShow.artistList ?? []).map((a) => ({
        character: a.character,
        role: a.role,
        slug: a.slug,
        type: a.type,
      })),
      complianceList:
        existingEnglishShow.complianceList?.map((c) => c.id) ?? [],
      complianceRating: existingEnglishShow.complianceRating ?? null,
      descriptorTags:
        existingEnglishShow.descriptorTags?.map((d) => d.id) ?? [],
      dialect: existingEnglishShow.dialect,
      format: existingEnglishShow.format,
      genreList: existingEnglishShow.genres?.map((g) => g.id) ?? [],
      gradients: existingEnglishShow.gradients ?? [],
      moods: existingEnglishShow.moods?.map((m) => m.id) ?? [],
      plotKeywords: existingEnglishShow.plotKeywords ?? [],
      primaryDialect: existingEnglishShow.primaryDialect ?? Dialect.HAR,
      releaseDate: existingEnglishShow.releaseDate?.toISOString() ?? '',
      show: {
        meta: {
          [Lang.EN]: {
            contentId: existingEnglishShow.contentId,
            description: existingEnglishShow.description,

            slug: existingEnglishShow.slug,
            thumbnails: existingEnglishShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: existingEnglishShow.title,
            trailer: englishTrailers,
            upcomingScheduleText:
              existingEnglishShow.upcomingScheduleText ?? '',
          },
          [Lang.HIN]: {
            contentId: existingHindiShow.contentId,
            description: existingHindiShow.description,

            slug: existingHindiShow.slug,
            thumbnails: existingHindiShow.allThumbnails?.map(
              convertContentThumbnailToShowThumbnail,
            ),
            title: existingHindiShow.title,
            trailer: hindiTrailers,
            upcomingScheduleText: existingHindiShow.upcomingScheduleText ?? '',
          },
        },
        rawMediaId: existingEnglishShow.selectedPeripheral.rawMediaId,
        seasons: responseSeasons,
      },
      status: existingEnglishShow.status,
      subGenreList: existingEnglishShow.subGenres?.map((sg) => sg.id) ?? [],
      targetAudience: existingEnglishShow.targetAudience ?? '',
      themes: existingEnglishShow.themes?.map((t) => t.id) ?? [],
    };
  }
}
