import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  NcantoAsset,
  IStructuredKeywordData,
  NcantoProgramType,
  NcantoAssetType,
} from '../../../common/interfaces/ncantoAsset.interface';
import { CONTENT_CONSTANTS } from '../constants/content.constants';
import {
  DescriptorTag,
  Episode,
  Mood,
  Theme,
} from '../entities/episodes.entity';
import { Season, SeasonStatus } from '../entities/season.entity';
import { Show } from '../entities/show.entity';
import { EpisodesRepository } from '../repositories/episode.repository';
import { SeasonsRepository } from '../repositories/season.repository';
import { ShowRepository } from '../repositories/show.repository';
import { Category } from '../schemas/category.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { NcantoUtils } from '@app/common/utils/ncanto.utils';
import { KafkaService } from '@app/kafka';
import { BatchHandler } from '@app/kafka';
import { ContentFormat } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';

interface IContentMetadataMessage {
  contentSlug: string;
  contentType: NcantoAssetType;
}
const CONTENT_AVAILABILITY = {
  END_TIME: new Date('2050-01-01').toISOString(),
  START_TIME: new Date('2020-01-01').toISOString(),
} as const;

@Injectable()
export class ContentMetadataConsumerService
  implements
    OnModuleInit,
    OnModuleDestroy,
    BatchHandler<IContentMetadataMessage>
{
  private readonly BROKERS = APP_CONFIGS.KAFKA.BROKERS;
  private readonly logger = new Logger(ContentMetadataConsumerService.name);
  private readonly TOPIC = APP_CONFIGS.KAFKA.CONTENT_CHANGES_TOPIC;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly showRepository: ShowRepository,
    private readonly episodeRepository: EpisodesRepository,
    private readonly seasonRepository: SeasonsRepository,
    private readonly ncantoUtils: NcantoUtils,
  ) {}

  formatEpisodeMetadata(
    episode: Episode,
    season: Season,
    show: Show,
  ): NcantoAsset {
    const genre = episode.genreList.map((genre) => genre.name);
    const subGenre = episode.subGenreList.map((genre) => genre.name);
    const imageUrls = this.getContentThumbnail(
      episode.thumbnail,
      NcantoAssetType.EPISODE,
    );
    const structuredKeywords = this.getStructuredKeyword(
      episode.moods || [],
      episode.themes || [],
      episode.categoryList || [],
      episode.descriptorTags || [],
    );
    let parentShowAssetId = null;
    if (show.referenceShowArr && show.referenceShowArr.length > 0) {
      parentShowAssetId = `${show.referenceShowArr[0].slug}_SHOW`;
    }
    return {
      assetId: `${episode.slug}_${NcantoAssetType.EPISODE}`,
      assetType: 'VOD',
      audioLang: [episode.language],
      availabilityEndTime: CONTENT_AVAILABILITY.END_TIME,
      availabilityStartTime: CONTENT_AVAILABILITY.START_TIME,
      durationSeconds: episode.duration,
      episode: episode.order,
      episodesInSeason: season.episodeCount,
      genreBroad: genre.length > 0 ? genre : undefined,
      genreMedium: subGenre.length > 0 ? subGenre : undefined,
      imageUrl: imageUrls.length > 0 ? imageUrls : undefined,
      originalTitle: episode.title,
      parentalGuidance: episode.complianceRating || '',
      programType: NcantoProgramType.EPISODE,
      publicationTime: episode.releaseDate
        ? new Date(episode.releaseDate).toISOString()
        : new Date(episode.createdAt).toISOString(),
      season: season.order,
      seriesId: parentShowAssetId || `${episode.showSlug}_SHOW`,
      sourceId: 'STAGE',
      structuredKeywords,
      subtitled: false,
      synopses: { long: { en: episode.description } },
      titles: { en: episode.title },
    };
  }

  formatMovieMetadata(movie: Episode): NcantoAsset {
    const genre = movie.genreList.map((genre) => genre.name);
    const subGenre = movie.subGenreList.map((genre) => genre.name);
    const imageUrls = this.getContentThumbnail(
      movie.thumbnail,
      NcantoAssetType.EPISODE,
    );
    const structuredKeywords = this.getStructuredKeyword(
      movie.moods || [],
      movie.themes || [],
      movie.categoryList || [],
      movie.descriptorTags || [],
    );
    return {
      assetId: `${movie.slug}_${NcantoAssetType.MOVIE}`,
      assetType: 'VOD',
      audioLang: [movie.language],
      availabilityEndTime: CONTENT_AVAILABILITY.END_TIME,
      availabilityStartTime: CONTENT_AVAILABILITY.START_TIME,
      durationSeconds: movie.duration,
      episode: undefined,
      episodesInSeason: undefined,
      genreBroad: genre.length > 0 ? genre : undefined,
      genreMedium: subGenre.length > 0 ? subGenre : undefined,
      imageUrl: imageUrls.length > 0 ? imageUrls : undefined,
      originalTitle: movie.title,
      parentalGuidance: movie.complianceRating || '',
      programType: NcantoProgramType.MOVIE,
      publicationTime: movie.releaseDate
        ? new Date(movie.releaseDate).toISOString()
        : new Date(movie.createdAt).toISOString(),
      season: undefined,
      seriesId: undefined,
      sourceId: 'STAGE',
      structuredKeywords,
      subtitled: false,
      synopses: { long: { en: movie.description } },
      titles: { en: movie.title },
    };
  }

  async formatSeasonMetadata(
    season: Season,
    episodes: Episode[],
    show: Show,
  ): Promise<NcantoAsset> {
    const seasonGenre = season.genreList.map((genre) => genre.name);
    const showGenre = show.genreList.map((genre) => genre.name);
    const subGenre = season.subGenreList.map((genre) => genre.name);
    const imageUrls = this.getContentThumbnail(
      season.thumbnail,
      NcantoAssetType.SHOW,
    );
    let structuredKeywords = this.getStructuredKeyword(
      show.moods || [],
      show.themes || [],
      show.categoryList || [],
      show.descriptorTags || [],
    );
    let parentShowAssetId = null;
    if (show.referenceShowArr && show.referenceShowArr.length > 0) {
      parentShowAssetId = `${show.referenceShowArr[0].slug}_${NcantoAssetType.SHOW}`;
      if (!structuredKeywords) {
        const parentShow = await this.showRepository.findOne({
          displayLanguage: Lang.EN,
          slug: show.referenceShowArr[0].slug,
        });
        structuredKeywords = this.getStructuredKeyword(
          parentShow?.moods || [],
          parentShow?.themes || [],
          parentShow?.categoryList || [],
          parentShow?.descriptorTags || [],
        );
      }
    }
    return {
      assetId: `${season.slug}_${NcantoAssetType.SEASON}`,
      assetType: 'VOD',
      audioLang: [season.language],
      availabilityEndTime: CONTENT_AVAILABILITY.END_TIME,
      availabilityStartTime: CONTENT_AVAILABILITY.START_TIME,
      durationSeconds: episodes.reduce(
        (acc, episode) => acc + episode.duration,
        0,
      ),
      episode: season.episodeCount,
      episodesInSeason: season.episodeCount,
      genreBroad: seasonGenre.length > 0 ? seasonGenre : showGenre,
      genreMedium: subGenre.length > 0 ? subGenre : undefined,
      imageUrl: imageUrls.length > 0 ? imageUrls : undefined,
      originalTitle: season.title,
      parentalGuidance: season.complianceRating || '',
      programType: NcantoProgramType.SEASON,
      publicationTime: show?.releaseDate
        ? new Date(show.releaseDate).toISOString()
        : new Date(show.createdAt).toISOString(),
      season: season.order,
      seriesId:
        parentShowAssetId || `${season.showSlug}_${NcantoAssetType.SHOW}`,
      sourceId: 'STAGE',
      structuredKeywords,
      subtitled: false,
      synopses: { long: { en: season.description } },
      titles: { en: season.title },
    };
  }

  formatShowMetadata(show: Show): NcantoAsset {
    const genre = show.genreList.map((genre) => genre.name);
    const subGenre = show.subGenreList.map((genre) => genre.name);
    const imageUrls = this.getContentThumbnail(
      show.thumbnail,
      NcantoAssetType.SHOW,
    );
    const isStandard = show.format === ContentFormat.STANDARD;
    const structuredKeywords = this.getStructuredKeyword(
      show.moods || [],
      show.themes || [],
      show.categoryList || [],
      show.descriptorTags || [],
    );
    return {
      assetId: `${show.slug}_${NcantoAssetType.SHOW}`,
      assetType: 'VOD',
      audioLang: [show.language],
      availabilityEndTime: CONTENT_AVAILABILITY.END_TIME,
      availabilityStartTime: CONTENT_AVAILABILITY.START_TIME,
      durationSeconds: show.duration,
      episode: undefined,
      episodesInSeason: undefined,
      genreBroad: genre.length > 0 ? genre : undefined,
      genreMedium: subGenre.length > 0 ? subGenre : undefined,
      imageUrl: imageUrls.length > 0 ? imageUrls : undefined,
      originalTitle: show.title,
      parentalGuidance: show.complianceRating || '',
      programType: isStandard
        ? NcantoProgramType.SHOW
        : NcantoProgramType.MICRO_DRAMA,
      publicationTime: show.releaseDate
        ? new Date(show.releaseDate).toISOString()
        : new Date(show.createdAt).toISOString(),
      season: undefined,
      seriesId: `${show.slug}_${NcantoAssetType.SHOW}`,
      sourceId: 'STAGE',
      structuredKeywords,
      subtitled: false,
      synopses: { long: { en: show.description } },
      titles: { en: show.title },
    };
  }

  getContentThumbnail(thumbnail: Thumbnail, type: NcantoAssetType) {
    const thumbnails = [];
    const prefix =
      type === NcantoAssetType.SHOW
        ? 'https://media.stage.in/show'
        : 'https://media.stage.in/episode';
    if (
      thumbnail.vertical?.ratio1?.sourceLink &&
      thumbnail.vertical?.ratio1?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/vertical/small/${thumbnail.vertical?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/vertical/medium/${thumbnail.vertical?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/vertical/large/${thumbnail.vertical?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/vertical/semi-large/${thumbnail.vertical?.ratio1?.sourceLink}`,
      );
    }
    if (
      thumbnail.horizontal?.ratio1?.sourceLink &&
      thumbnail.horizontal?.ratio1?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/horizontal/small/${thumbnail.horizontal?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/medium/${thumbnail.horizontal?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/large/${thumbnail.horizontal?.ratio1?.sourceLink}`,
      );
    }
    if (
      thumbnail.horizontal?.ratio2?.sourceLink &&
      thumbnail.horizontal?.ratio2?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/horizontal/small/${thumbnail.horizontal?.ratio2?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/medium/${thumbnail.horizontal?.ratio2?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/large/${thumbnail.horizontal?.ratio2?.sourceLink}`,
      );
    }

    if (
      thumbnail.horizontal?.ratio3?.sourceLink &&
      thumbnail.horizontal?.ratio3?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/horizontal/small/${thumbnail.horizontal?.ratio3?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/medium/${thumbnail.horizontal?.ratio3?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/large/${thumbnail.horizontal?.ratio3?.sourceLink}`,
      );
    }
    if (
      thumbnail.horizontal?.ratio4?.sourceLink &&
      thumbnail.horizontal?.ratio4?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/horizontal/small/${thumbnail.horizontal?.ratio4?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/medium/${thumbnail.horizontal?.ratio4?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/horizontal/large/${thumbnail.horizontal?.ratio4?.sourceLink}`,
      );
    }

    if (
      thumbnail.square?.ratio1?.sourceLink &&
      thumbnail.square?.ratio1?.sourceLink !== ''
    ) {
      thumbnails.push(
        `${prefix}/square/small/${thumbnail.square?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/square/medium/${thumbnail.square?.ratio1?.sourceLink}`,
      );
      thumbnails.push(
        `${prefix}/square/large/${thumbnail.square?.ratio1?.sourceLink}`,
      );
    }
    return thumbnails;
  }

  getStructuredKeyword(
    moods: Mood[],
    themes: Theme[],
    categories: Category[],
    descriptorTags: DescriptorTag[],
  ): IStructuredKeywordData | undefined {
    const structuredKeyword: IStructuredKeywordData = {};
    if (moods.length > 0) {
      structuredKeyword.moods = moods.map((mood) => {
        return {
          id: mood.id.toString(),
          perLanguage: { en: mood.name },
          weight: CONTENT_CONSTANTS.MOOD_WEIGHT,
        };
      });
    }
    if (themes.length > 0) {
      structuredKeyword.themes = themes.map((theme) => {
        return {
          id: theme.id.toString(),
          perLanguage: { en: theme.name },
          weight: CONTENT_CONSTANTS.THEME_WEIGHT,
        };
      });
    }
    if (categories.length > 0) {
      structuredKeyword.categories = categories.map((category) => {
        return {
          id: category.id.toString(),
          perLanguage: { en: category.name },
          weight: CONTENT_CONSTANTS.CATEGORY_WEIGHT,
        };
      });
    }
    if (descriptorTags.length > 0) {
      structuredKeyword.descriptorTags = descriptorTags.map((descriptorTag) => {
        return {
          id: descriptorTag.id.toString(),
          perLanguage: { en: descriptorTag.name },
          weight: CONTENT_CONSTANTS.DESCRIPTOR_TAG_WEIGHT,
        };
      });
    }
    return structuredKeyword?.moods?.length ||
      structuredKeyword?.themes?.length ||
      structuredKeyword?.categories?.length ||
      structuredKeyword?.descriptorTags?.length
      ? structuredKeyword
      : undefined;
  }

  async handleBatch(messages: IContentMetadataMessage[]): Promise<boolean> {
    this.logger.log(
      `Processing contentMetadata batch with ${messages.length} messages`,
    );

    if (!messages || messages.length === 0) {
      this.logger.debug('No messages to process');
      return true;
    }

    this.logger.log(
      `Processing content metadata batch with ${messages.length} messages`,
    );

    try {
      for (const message of messages) {
        this.logger.debug(
          `Processing content: ${message.contentType} - ${message.contentSlug} for NCanto ingestion`,
        );

        switch (message.contentType) {
          case NcantoAssetType.SHOW: {
            const show = await this.showRepository.findOne({
              displayLanguage: Lang.EN,
              slug: message.contentSlug,
            });
            if (!show) {
              this.logger.error(
                `Show not found for slug: ${message.contentSlug}`,
              );
              continue;
            }
            let parentShow = null;
            if (show.referenceShowArr && show.referenceShowArr.length > 0) {
              parentShow = await this.showRepository.findOne({
                displayLanguage: Lang.EN,
                slug: show.referenceShowArr[0].slug,
              });
            }
            const formattedShowMetadata = this.formatShowMetadata(
              parentShow || show,
            );
            if (
              [ShowStatus.ACTIVE, ShowStatus.PREVIEW_PUBLISH].includes(
                show.status,
              )
            ) {
              await this.ncantoUtils.addContentMetadata(formattedShowMetadata);
            } else {
              await this.ncantoUtils.removeContentMetadata(
                formattedShowMetadata,
              );
            }
            break;
          }
          case NcantoAssetType.MOVIE: {
            const movie = await this.episodeRepository.findOne({
              displayLanguage: Lang.EN,
              slug: message.contentSlug,
              type: ContentType.MOVIE,
            });
            if (!movie) {
              this.logger.error(
                `Movie not found for slug: ${message.contentSlug}`,
              );
              continue;
            }
            const formattedMovieMetadata = this.formatMovieMetadata(movie);
            if (
              [EpisodeStatus.ACTIVE, EpisodeStatus.PREVIEW_PUBLISHED].includes(
                movie.status,
              )
            ) {
              await this.ncantoUtils.addContentMetadata(formattedMovieMetadata);
            } else {
              await this.ncantoUtils.removeContentMetadata(
                formattedMovieMetadata,
              );
            }
            break;
          }
          case NcantoAssetType.SEASON: {
            const season = await this.seasonRepository.findOne({
              displayLanguage: Lang.EN,
              slug: message.contentSlug,
            });
            const seasonEpisodes = await this.episodeRepository.find({
              displayLanguage: Lang.EN,
              seasonSlug: message.contentSlug,
              status: {
                $in: [EpisodeStatus.ACTIVE, EpisodeStatus.PREVIEW_PUBLISHED],
              },
            });
            const show = await this.showRepository.findOne({
              displayLanguage: Lang.EN,
              format: ContentFormat.STANDARD,
              slug: season?.showSlug,
            });
            if (!season || !show) {
              this.logger.error(
                `Season or show not found for slug: ${message.contentSlug}`,
              );
              continue;
            }
            const formattedSeasonMetadata = await this.formatSeasonMetadata(
              season,
              seasonEpisodes || [],
              show,
            );
            if (season.status === SeasonStatus.ACTIVE) {
              await this.ncantoUtils.addContentMetadata(
                formattedSeasonMetadata,
              );
            } else {
              await this.ncantoUtils.removeContentMetadata(
                formattedSeasonMetadata,
              );
            }
            break;
          }
          case NcantoAssetType.EPISODE: {
            const episode = await this.episodeRepository.findOne({
              displayLanguage: Lang.EN,
              slug: message.contentSlug,
            });
            const episodeSeason = await this.seasonRepository.findOne({
              displayLanguage: Lang.EN,
              slug: episode?.seasonSlug,
              status: SeasonStatus.ACTIVE,
            });
            const show = await this.showRepository.findOne({
              displayLanguage: Lang.EN,
              format: ContentFormat.STANDARD,
              slug: episode?.showSlug,
            });
            if (!episode || !episodeSeason || !show) {
              this.logger.error(
                `Episode or season or show not found for slug: ${message.contentSlug}`,
              );
              continue;
            }
            const formattedEpisodeMetadata = this.formatEpisodeMetadata(
              episode,
              episodeSeason,
              show,
            );
            if (
              episode.status === EpisodeStatus.ACTIVE ||
              episode.status === EpisodeStatus.PREVIEW_PUBLISHED
            ) {
              await this.ncantoUtils.addContentMetadata(
                formattedEpisodeMetadata,
              );
            } else {
              await this.ncantoUtils.removeContentMetadata(
                formattedEpisodeMetadata,
              );
            }
            break;
          }
          default:
            this.logger.error(`Unknown content type: ${message.contentType}`);
            break;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Critical error processing contentmetadata batch ${error}`,
      );
      return false;
    }
  }

  async onModuleDestroy() {
    await this.kafkaService.disconnect();
  }

  async onModuleInit() {
    if (APP_CONFIGS.ENV === 'test') {
      return;
    }
    this.logger.log(`Initializing Kafka consumer for topic ${this.TOPIC}`);
    this.kafkaService
      .connect()
      .then(() => {
        this.logger.log(`Connected to Kafka brokers for topic ${this.TOPIC}`);
        this.kafkaService
          .subscribe(
            this.TOPIC,
            {
              brokers: this.BROKERS,
              clientId: APP_CONFIGS.KAFKA.CLIENT_ID,
              flushInterval: 30000,
              groupId: APP_CONFIGS.KAFKA.GROUP_ID_CONTENT_CHANGES,
            },
            this,
          )
          .then(() => {
            this.logger.log(
              `Successfully subscribed to Kafka topic ${this.TOPIC}`,
            );
          });
      })
      .catch((error) => {
        this.logger.error(
          { error },
          `Failed to connect to Kafka brokers for topic ${this.TOPIC}`,
        );
        // Don't throw error to prevent blocking server startup
      });
  }
  // }
}
