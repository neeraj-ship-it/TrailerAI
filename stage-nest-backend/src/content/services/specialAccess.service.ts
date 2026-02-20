import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  buildMediaAssetUrl,
  buildSpecialAccessThumbnail,
} from '../../../common/utils/media-file.utils';

import { Types } from 'mongoose';

import {
  FeatureItems,
  AssetsV2,
  FeatureEnum,
} from '../../../common/entities/assetsV2.entity';
import { ContentAssets } from '../../../common/entities/contentAssets.entity';
import { ContentFormat } from '../../../common/entities/contents.entity';
import { Dialect, Lang, AssetsPlatforms } from '../../../common/enums/app.enum';
import { ContentType } from '../../../common/enums/common.enums';
import { PeripheralMediaType } from '../../../common/enums/media.enum';
import {
  OfferPageSchema,
  StateCategory,
  StateSchema,
} from '../../../common/schema/specialAccess.schema';
import type {
  CreateUserSpecialStateRequestDto,
  MicrodramaFreePreviewRequestDto,
  UpdateUserSpecialStateRequestDto,
} from '../dto/specialAccess.request.dto';
import type {
  FloatingBannerDto,
  HookClipDto,
  MicrodramaFreePreviewResponseDto,
  PlatterDto,
  SpecialAccessResponseDto,
  SpecialAccessStateDto,
  WebOfferPageResponseDto,
} from '../dto/specialAccess.response.dto';
import { StateCategoryDto } from '../dto/specialAccess.response.dto';
import type { ThumbnailWithRatioDto } from '../dto/thumbnail.dto';
import type {
  UserFreeMicrodramaItem,
  UserSpecialStateItem,
} from '../entities/userSpecialAccess.entity';
import { AssetsV2Repository } from '../repositories/assetsV2.repository';
import { ContentAssetsRepository } from '../repositories/contentAssets.repository';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ShowRepository } from '../repositories/show.repository';
import { UserSpecialStatesRepository } from '../repositories/userSpecialStates.repository';
import { ShowsService } from './shows.services';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { RedisService } from '@app/redis';

@Injectable()
export class SpecialAccessService {
  private readonly REDIS_TTL_ONE_DAY = 86400; // 1 day in seconds

  constructor(
    private readonly episodeRepository: EpisodesRepository,
    private readonly showRepository: ShowRepository,
    private readonly showsService: ShowsService,
    private readonly userSpecialStatesRepository: UserSpecialStatesRepository,
    private readonly contentAssetsRepository: ContentAssetsRepository,
    private readonly assetsV2Repository: AssetsV2Repository,
    private readonly redisService: RedisService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private async buildMicrodramaFreePreviewResponse(
    assignedMicrodrama: UserFreeMicrodramaItem,
    dialect: Dialect,
    language: Lang,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    const assetsV2 = await this.errorHandler.raiseErrorIfNullAsync(
      this.assetsV2Repository.findByFeature(
        FeatureEnum.MICRO_DRAMA_FREE_PREVIEW,
        [],
      ),
      Errors.ASSETS.NOT_FOUND(),
    );

    const assets = this.getKeyFromAssetsHelper(
      assetsV2,
      dialect,
      language,
      AssetsPlatforms.COMMON,
    );
    const microdramaAssets = this.errorHandler.raiseErrorIfNull(
      assets.microdrama_preview,
      Errors.ASSETS.NOT_FOUND(),
    );

    // get show details
    const showDetails = await this.showsService.getShowDetailsBySlug(
      assignedMicrodrama.show_slug,
      language,
    );

    const freeEpisodes = await this.getFreeEpisodes(
      assignedMicrodrama.show_slug,
      language,
    );

    return {
      content: {
        id: showDetails._id,
        slug: assignedMicrodrama.show_slug,
        thumbnail: showDetails.thumbnail,
        title: showDetails.title,
      },
      content_banner: microdramaAssets.content_banner,
      download_overlay: microdramaAssets.download_overlay,
      free_preview_content: freeEpisodes,
      free_preview_ended_overlay: microdramaAssets.free_preview_ended_overlay,
      free_preview_tag: buildMediaAssetUrl(
        'asset_url',
        microdramaAssets.free_preview_tag,
      ),
      home_page_floating_banner: microdramaAssets.home_page_floating_banner,
      is_free_preview_ended: assignedMicrodrama.banner_shown,
      lock_ribbon: buildMediaAssetUrl(
        'asset_url',
        microdramaAssets.lock_ribbon,
      ),
      offer_page: microdramaAssets.microdrama_offer_page,
      preview_thresholds: {
        banner_unlock_percent:
          microdramaAssets.preview_thresholds.banner_unlock_percent,
        preview_end_overlay_percent:
          microdramaAssets.preview_thresholds.preview_end_overlay_percent,
        show_banner_episode_id: freeEpisodes[0],
      },
      rewatch_overlay: microdramaAssets.rewatch_overlay,
      unlock_episode_tag: buildMediaAssetUrl(
        'asset_url',
        microdramaAssets.unlock_episode_tag,
      ),
    };
  }

  /**
   * Builds the complete SpecialAccessResponseDto
   */
  private async buildSpecialAccessResponse(
    contentAssets: Pick<
      ContentAssets,
      '_id' | 'episode_slug' | 'show_slug' | 'content_type' | 'states'
    >,
    episode: {
      _id: number;
      title: string;
      thumbnail?: unknown;
      mediaList?: { mediaType?: string; sourceLink?: string }[];
    },
    dialect: Dialect,
    lang: Lang,
    currentStateCategory: string,
    currentStateValue: number,
  ): Promise<SpecialAccessResponseDto> {
    // Fetch AssetsV2 for offer_page (with caching)
    const assetsV2 = await this.errorHandler.raiseErrorIfNullAsync(
      this.assetsV2Repository.findByFeature(FeatureEnum.SPECIAL_ACCESS, []),
      Errors.ASSETS.NOT_FOUND(),
    );

    // Get offer_page from AssetsV2
    let offerPage = null;
    const assets = this.getKeyFromAssetsHelper(
      assetsV2,
      dialect,
      lang,
      AssetsPlatforms.COMMON,
    );
    offerPage = this.errorHandler.raiseErrorIfNull(
      assets.special_access,
      Errors.ASSETS.NOT_FOUND(),
    );

    const states = contentAssets.states || [];

    // Transform states
    const transformedStates = this.transformStates(states, offerPage);

    const currentState = states.find(
      (state) =>
        state.state_category === currentStateCategory &&
        state.state_value === currentStateValue,
    );

    // Find trailer from mediaList
    let trailer: string | undefined;
    if (episode.mediaList && Array.isArray(episode.mediaList)) {
      const trailerMedia = episode.mediaList.find(
        (media) => media.mediaType === PeripheralMediaType.TRAILER,
      );
      if (trailerMedia?.sourceLink) {
        trailer = trailerMedia.sourceLink;
      }
    }

    // Get all ContentAssets IDs for this episode_slug
    let allIds = await this.getAllContentAssetIds(
      contentAssets.episode_slug || contentAssets.show_slug || '',
      contentAssets.content_type,
    );

    // Ensure allIds is always an array
    if (!Array.isArray(allIds)) {
      allIds = [];
    }

    // Ensure the current content._id (episode._id) is included in all_ids
    const currentContentId = episode._id;
    if (
      typeof currentContentId === 'number' &&
      !allIds.includes(currentContentId)
    ) {
      allIds = [currentContentId, ...allIds];
    }

    // Ensure all_ids contains only numbers
    const allIdsNumbers = allIds.filter(
      (id): id is number => typeof id === 'number' && !isNaN(id),
    );

    const content: SpecialAccessResponseDto['content'] = {
      all_ids: allIdsNumbers,
      // Use episode._id, not contentAssets._id
      id: episode._id,
      slug:
        contentAssets.content_type === ContentType.SHOW
          ? (contentAssets.show_slug ?? contentAssets.episode_slug ?? '')
          : (contentAssets.episode_slug ?? contentAssets.show_slug ?? ''),
      thumbnail: buildSpecialAccessThumbnail(
        episode.thumbnail as ThumbnailWithRatioDto | undefined,
        contentAssets.content_type,
      ),
      title: episode.title,
      type: contentAssets.content_type,
      watch_duration: 0,
    };

    if (trailer) {
      content.trailer = trailer;
    }

    const response: SpecialAccessResponseDto = {
      content,
      current_state_category: currentStateCategory as StateCategoryDto,
      ...(currentState?.slot != null && {
        current_state_slot: currentState.slot,
      }),
      current_state_value: currentStateValue,
      states: transformedStates,
    };

    const sanitizedResponse = this.sanitizeResponseForPrefixing(response);

    return this.prefixMediaAssetUrls(
      sanitizedResponse,
    ) as SpecialAccessResponseDto;
  }
  private findMatchingState(
    states: UserSpecialStateItem[] = [],
    episodeSlug: string,
  ): UserSpecialStateItem | undefined {
    return states.find(
      (state) =>
        state.episode_slug === episodeSlug || state.show_slug === episodeSlug,
    );
  }

  /**
   * Gets all unique ContentAssets IDs for an episode_slug with Redis caching
   */
  private async getAllContentAssetIds(
    episodeSlug: string,
    content_type: ContentType = ContentType.MOVIE,
  ): Promise<number[]> {
    // Fetch from database
    let query = {};
    if (content_type === ContentType.MOVIE) {
      query = { episode_slug: episodeSlug };
    } else {
      query = { show_slug: episodeSlug };
    }

    const contentAssetsList = await this.contentAssetsRepository.find(
      query,
      ['_id'],
      { cache: { enabled: true }, lean: true },
    );

    // Extract unique IDs
    const allIds = Array.from(
      new Set(
        (contentAssetsList || [])
          .map((asset) => asset._id)
          .filter((id): id is number => typeof id === 'number' && !isNaN(id)),
      ),
    );

    return allIds;
  }
  private async getAssignedMicrodrama(
    userId: string,
  ): Promise<UserFreeMicrodramaItem | null> {
    const assignedMicrodrama = await this.userSpecialStatesRepository.findById(
      new Types.ObjectId(userId),
      ['free_microdrama'],
    );
    if (!assignedMicrodrama) {
      return null;
    }

    if (!assignedMicrodrama.free_microdrama) {
      return {
        banner_shown: false,
        show_slug: '',
      };
    }

    return assignedMicrodrama.free_microdrama;
  }

  /**
   * Gets cached ContentAssets by episode_slug and language
   */
  private async getCachedContentAssetsByEpisodeSlug(
    episodeSlug: string,
    language: Lang,
    projections?: (
      | '_id'
      | 'episode_slug'
      | 'show_slug'
      | 'content_type'
      | 'states'
    )[],
    content_type: ContentType = ContentType.MOVIE,
  ): Promise<Pick<
    ContentAssets,
    '_id' | 'episode_slug' | 'show_slug' | 'content_type' | 'states'
  > | null> {
    // Fetch from database
    let query = {};
    if (content_type === ContentType.MOVIE) {
      query = {
        content_language: language,
        episode_slug: episodeSlug,
      };
    } else {
      query = {
        content_language: language,
        show_slug: episodeSlug,
      };
    }
    const contentAssets = await this.contentAssetsRepository.findOne(
      query,
      projections,
      { cache: { enabled: true }, lean: true },
    );

    return contentAssets;
  }

  private async getFreeEpisodes(
    show_slug: string,
    language: Lang,
  ): Promise<number[]> {
    const freeEpisodes = await this.episodeRepository.find(
      {
        displayLanguage: language,
        showSlug: show_slug,
        // freeEpisode: true,
      },
      ['_id'],
      { lean: true, limit: 2 },
    );

    // NOTE: Create index for the above query and change freeEpisode to true in DB

    if (!freeEpisodes) {
      return [];
    }

    return freeEpisodes.map((episode) => episode._id);
  }

  private async getUserStatesOrThrow(
    userId: string,
  ): Promise<{ states: UserSpecialStateItem[] }> {
    const userSpecialStates = await this.userSpecialStatesRepository.findById(
      userId,
      ['states'],
    );

    if (!userSpecialStates || !userSpecialStates.states?.length) {
      throw new NotFoundException('User special states not found');
    }

    return userSpecialStates as { states: UserSpecialStateItem[] };
  }

  private prefixMediaAssetUrls<T>(payload: T): T {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.prefixMediaAssetUrls(item)) as T;
    }

    if (payload && typeof payload === 'object') {
      const entries = Object.entries(payload as Record<string, unknown>).map(
        ([key, value]) => {
          if (typeof value === 'string') {
            return [key, buildMediaAssetUrl(key, value)];
          }

          if (value && typeof value === 'object') {
            return [key, this.prefixMediaAssetUrls(value)];
          }

          return [key, value];
        },
      );

      return Object.fromEntries(entries) as T;
    }

    return payload;
  }

  private sanitizeResponseForPrefixing<T>(payload: T): T {
    return JSON.parse(JSON.stringify(payload)) as T;
  }

  /**
   * Transforms ContentAssets states to SpecialAccessStateDto array
   */
  private transformStates(
    states: StateSchema[],
    offerPage: OfferPageSchema | null,
  ): SpecialAccessStateDto[] {
    // Sanitize states to remove Mongoose properties using JSON serialization
    const sanitizedStates = this.sanitizeResponseForPrefixing(states || []);
    const sanitizedOfferPage = offerPage
      ? this.sanitizeResponseForPrefixing(offerPage)
      : null;

    return sanitizedStates.map((state: StateSchema) => {
      const stateCategory = state.state_category as unknown as StateCategoryDto;

      // Helper to build widget with conditional title_image inclusion
      // DTO level: title_image is optional, so only include if valid
      const buildWidget = (widget: unknown): Record<string, unknown> | null => {
        if (!widget || typeof widget !== 'object') {
          return null;
        }
        const widgetObj = widget as Record<string, unknown>;
        const { title_image, ...rest } = widgetObj;

        // Build widget object, conditionally including title_image only if valid
        const built: Record<string, unknown> = { ...rest };

        // Only include title_image if it's a valid non-empty string
        // If invalid, it won't be included (DTO allows optional, so it won't be in response)
        if (
          title_image &&
          typeof title_image === 'string' &&
          title_image.trim() !== ''
        ) {
          built.title_image = title_image;
        }
        // If invalid, title_image is omitted - DTO handles optional field

        return built;
      };

      // Handle InitialStateDto - requires offer_page
      if (stateCategory === StateCategoryDto.INITIAL) {
        if (!sanitizedOfferPage) {
          throw new NotFoundException(
            'Offer page is required for initial state but not found',
          );
        }
        // Convert thumbnail factors from number to string to match DTO
        const offerPage = {
          ...sanitizedOfferPage,
          thumbnail_bottom_factor: String(
            sanitizedOfferPage.thumbnail_bottom_factor,
          ),
          thumbnail_width_factor: String(
            sanitizedOfferPage.thumbnail_width_factor,
          ),
        };
        return {
          offer_page: offerPage,
          state_category: stateCategory,
          state_value: state.state_value,
          ...(state.floating_banner && {
            floating_banner: this.sanitizeResponseForPrefixing(
              state.floating_banner,
            ) as FloatingBannerDto,
          }),
          ...(state.slot != null && { slot: state.slot }),
        } as SpecialAccessStateDto;
      }

      // Handle ClaimedStateDto - slot is optional, no required fields beyond base
      if (stateCategory === StateCategoryDto.CLAIMED) {
        return {
          state_category: stateCategory,
          state_value: state.state_value,
          ...(state.thumbnail_tag_url && {
            thumbnail_tag_url: state.thumbnail_tag_url,
          }),
          ...(state.floating_banner && {
            floating_banner: this.sanitizeResponseForPrefixing(
              state.floating_banner,
            ) as FloatingBannerDto,
          }),
          ...(state.platter && {
            platter: this.sanitizeResponseForPrefixing(
              state.platter,
            ) as PlatterDto,
          }),
          ...(state.slot != null && { slot: state.slot }),
        } as SpecialAccessStateDto;
      }

      // Handle ProgressStateDto - requires slot
      if (stateCategory === StateCategoryDto.CONSUMPTION) {
        if (state.slot == null) {
          throw new NotFoundException(
            'Slot is required for consumption state but not found',
          );
        }
        const builtNonExpandableWidget = buildWidget(
          state.non_expandable_widget,
        );
        const builtExpandableWidget = buildWidget(state.expandable_widget);

        return {
          slot: state.slot,
          state_category: stateCategory,
          state_value: state.state_value,
          ...(state.consumption_tag_text && {
            consumption_tag_text: state.consumption_tag_text,
          }),
          ...(state.thumbnail_tag_url && {
            thumbnail_tag_url: state.thumbnail_tag_url,
          }),
          ...(state.floating_banner && {
            floating_banner: this.sanitizeResponseForPrefixing(
              state.floating_banner,
            ) as FloatingBannerDto,
          }),
          ...(state.hook_clip && {
            hook_clip: this.sanitizeResponseForPrefixing(
              state.hook_clip,
            ) as HookClipDto,
          }),
          ...(builtNonExpandableWidget && {
            non_expandable_widget: builtNonExpandableWidget,
          }),
          ...(builtExpandableWidget && {
            expandable_widget: builtExpandableWidget,
          }),
          ...(state.platter && {
            platter: this.sanitizeResponseForPrefixing(
              state.platter,
            ) as PlatterDto,
          }),
        } as SpecialAccessStateDto;
      }

      // Handle TerminalStateDto - requires slot
      if (stateCategory === StateCategoryDto.TERMINAL) {
        if (state.slot == null) {
          throw new NotFoundException(
            'Slot is required for terminal state but not found',
          );
        }
        const builtNonExpandableWidget = buildWidget(
          state.non_expandable_widget,
        );
        const builtExpandableWidget = buildWidget(state.expandable_widget);

        return {
          slot: state.slot,
          state_category: stateCategory,
          state_value: state.state_value,
          ...(state.consumption_tag_text && {
            consumption_tag_text: state.consumption_tag_text,
          }),
          ...(state.thumbnail_tag_url && {
            thumbnail_tag_url: state.thumbnail_tag_url,
          }),
          ...(state.floating_banner && {
            floating_banner: this.sanitizeResponseForPrefixing(
              state.floating_banner,
            ) as FloatingBannerDto,
          }),
          ...(state.hook_clip && {
            hook_clip: this.sanitizeResponseForPrefixing(
              state.hook_clip,
            ) as HookClipDto,
          }),
          ...(builtNonExpandableWidget && {
            non_expandable_widget: builtNonExpandableWidget,
          }),
          ...(builtExpandableWidget && {
            expandable_widget: builtExpandableWidget,
          }),
          ...(state.platter && {
            platter: this.sanitizeResponseForPrefixing(
              state.platter,
            ) as PlatterDto,
          }),
        } as SpecialAccessStateDto;
      }

      // Fallback - should not reach here
      throw new NotFoundException(
        `Unknown state category: ${state.state_category}`,
      );
    });
  }

  async createUserSpecialState(
    userId: string,
    dialect: Dialect,
    body: CreateUserSpecialStateRequestDto,
    language: Lang,
  ): Promise<SpecialAccessResponseDto> {
    const { content_id, content_type } = body;

    if (
      content_type !== ContentType.MOVIE &&
      content_type !== ContentType.SHOW
    ) {
      throw new BadRequestException('Content type mismatch');
    }

    // Fetch Episode and UserStates in parallel first
    const [episode, existingStates] = await Promise.all([
      content_type == ContentType.SHOW
        ? this.showRepository.findOne(
            { _id: content_id },
            [
              '_id',
              'slug',
              'title',
              'thumbnail',
              'displayLanguage',
              'language',
              'format',
              'mediaList',
            ],
            { cache: { enabled: true }, lean: true },
          )
        : this.episodeRepository.findOne(
            { _id: content_id },
            [
              '_id',
              'showSlug',
              'slug',
              'type',
              'format',
              'displayLanguage',
              'language',
              'title',
              'thumbnail',
              'mediaList',
            ],
            { lean: true },
          ),
      this.userSpecialStatesRepository.findById(userId, [
        'states',
        'free_microdrama',
      ]),
    ]);

    if (!episode) {
      throw new NotFoundException(`Episode with id ${content_id} not found`);
    }

    // Fetch ContentAssets using episode slug and language
    const contentAssets = await this.getCachedContentAssetsByEpisodeSlug(
      episode.slug,
      language,
      ['_id', 'episode_slug', 'show_slug', 'content_type', 'states'],
      content_type,
    );

    if (!contentAssets) {
      throw new NotFoundException(
        `ContentAssets with episode_slug ${episode.slug} and language ${language} not found`,
      );
    }

    this.errorHandler.raiseErrorIfFalse(
      existingStates?.free_microdrama?.show_slug == null,
      Errors.USER.USER_ALREADY_ASSIGNED_FREE_CONTENT(
        'Free microdrama already assigned',
      ),
    );

    const matchingState = this.findMatchingState(
      existingStates?.states,
      episode.slug,
    );

    if (!matchingState) {
      await this.userSpecialStatesRepository.addStateToUser(userId, {
        content_dialect: episode.language as Dialect,
        content_format: episode.format as ContentFormat,
        content_id: content_id,
        content_type: content_type,
        episode_slug: content_type == ContentType.MOVIE ? episode.slug : '',
        show_slug: content_type == ContentType.SHOW ? episode.slug : '',
        state_category: StateCategory.INITIAL,
        state_value: 0,
      });

      return this.buildSpecialAccessResponse(
        contentAssets,
        episode,
        dialect,
        episode.displayLanguage as Lang,
        StateCategory.INITIAL,
        0,
      );
    }

    return this.buildSpecialAccessResponse(
      contentAssets,
      episode,
      dialect,
      episode.displayLanguage as Lang,
      matchingState.state_category,
      matchingState.state_value,
    );
  }

  getKeyFromAssetsHelper(
    data: AssetsV2,
    dialect: Dialect,
    language: Lang,
    platform: AssetsPlatforms,
  ): FeatureItems {
    // Step 1: Navigate to dialect level
    const dialectData = this.errorHandler.raiseErrorIfNull(
      data.dialects?.[dialect],
      Errors.ASSETS.NOT_FOUND(
        `Dialect '${dialect}' not found in AssetsV2 data`,
      ),
    );

    // Step 2: Navigate to language level
    const languageData = this.errorHandler.raiseErrorIfNull(
      dialectData[language],
      Errors.ASSETS.NOT_FOUND(
        `Language '${language}' not found in dialect '${dialect}'`,
      ),
    );

    // Step 3: Navigate to platform level
    const platformData = this.errorHandler.raiseErrorIfNull(
      languageData[platform],
      Errors.ASSETS.NOT_FOUND(
        `Platform '${platform}' not found in language '${language}'`,
      ),
    );
    return platformData;
  }

  async getMicrodramaFreePreview(
    userId: string,
    dialect: Dialect,
    language: Lang,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    // get user states
    const assignedMicrodrama = await this.errorHandler.raiseErrorIfNullAsync(
      this.getAssignedMicrodrama(userId),
      Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(),
    );

    this.errorHandler.raiseErrorIfTrue(
      assignedMicrodrama.show_slug == '',
      Errors.USER.USER_ALREADY_ASSIGNED_FREE_CONTENT(),
    );

    // generate response
    return this.buildMicrodramaFreePreviewResponse(
      assignedMicrodrama,
      dialect,
      language,
    );
  }

  async getUserSpecialAccess(
    userId: string,
    dialect: Dialect,
    language: Lang,
  ): Promise<SpecialAccessResponseDto> {
    const userStates = await this.getUserStatesOrThrow(userId);

    // Find matching state by episode_slug (not just first state)
    const matchingState = userStates.states.find(
      (state) => state.episode_slug || state.show_slug,
    );

    if (!matchingState?.episode_slug && !matchingState?.show_slug) {
      throw new NotFoundException('User special state missing episode slug');
    }

    // Fetch ContentAssets and Episode/Show in parallel
    const [contentAssets, episode] = await Promise.all([
      this.getCachedContentAssetsByEpisodeSlug(
        matchingState.episode_slug || matchingState.show_slug || '',
        language,
        ['_id', 'episode_slug', 'show_slug', 'content_type', 'states'],
        matchingState.content_type,
      ),
      matchingState.content_type === ContentType.SHOW
        ? this.showRepository.findOne(
            { displayLanguage: language, slug: matchingState.show_slug },
            ['_id', 'title', 'thumbnail', 'mediaList'],
            { cache: { enabled: true }, lean: true },
          )
        : this.episodeRepository.findOne(
            { displayLanguage: language, slug: matchingState.episode_slug },
            ['_id', 'title', 'thumbnail', 'mediaList'],
            { cache: { enabled: true }, lean: true },
          ),
    ]);

    if (!contentAssets) {
      throw new NotFoundException(
        `ContentAssets with episode_slug ${matchingState.episode_slug} and content_language ${language} not found`,
      );
    }

    if (!episode) {
      throw new NotFoundException(
        `Episode with slug ${matchingState.episode_slug} not found`,
      );
    }

    return this.buildSpecialAccessResponse(
      contentAssets,
      episode,
      dialect,
      language,
      matchingState.state_category,
      matchingState.state_value,
    );
  }

  async getWebOfferPage(
    dialect: Dialect,
    language: Lang,
    query: CreateUserSpecialStateRequestDto,
  ): Promise<WebOfferPageResponseDto> {
    const { content_id } = query;

    const [episode, assetsV2] = await Promise.all([
      this.errorHandler.raiseErrorIfNullAsync(
        this.episodeRepository.findActiveMovieById(content_id, [
          'title',
          'thumbnail',
          'slug',
        ]),
        Errors.EPISODE.NOT_FOUND(),
      ),
      this.errorHandler.raiseErrorIfNullAsync(
        this.assetsV2Repository.findByFeature(FeatureEnum.SPECIAL_ACCESS, []),
        Errors.ASSETS.NOT_FOUND('Special access assets not found'),
      ),
    ]);

    const webAssetsV2 = this.getKeyFromAssetsHelper(
      assetsV2,
      dialect,
      language,
      AssetsPlatforms.WEB,
    );
    const offerPage = this.errorHandler.raiseErrorIfNull(
      webAssetsV2.web_special_access,
      Errors.ASSETS.NOT_FOUND('Special access assets not found'),
    );

    await this.errorHandler.raiseErrorIfNullAsync(
      this.contentAssetsRepository.findOne({ _id: content_id }, ['_id'], {
        lean: true,
      }),
      Errors.EPISODE.NOT_FOUND(),
    );

    return {
      content: {
        thumbnail: buildSpecialAccessThumbnail(episode.thumbnail),
        title: episode.title,
      },
      cta: offerPage.cta,
      full_screen_background_image: offerPage.full_screen_background_image,
      gift_box_gif: offerPage.gift_box_gif,
      gift_box_image: offerPage.gift_box_image,
      gift_box_open: offerPage.gift_box_open,
      headings: offerPage.headings,
      highlighted_background_image: offerPage.highlighted_background_image,
      login_screen_heading: offerPage.login_screen_heading,
    };
  }

  async patchMicrodramaFreePreview(
    userId: string,
    dialect: Dialect,
    language: Lang,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    let assignedMicrodrama = await this.errorHandler.raiseErrorIfNullAsync(
      this.getAssignedMicrodrama(userId),
      Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(),
    );

    this.errorHandler.raiseErrorIfTrue(
      assignedMicrodrama.show_slug == '',
      Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(
        'User have been assigned Special Access',
      ),
    );

    if (assignedMicrodrama.banner_shown === false) {
      // update state
      assignedMicrodrama = await this.errorHandler.raiseErrorIfNullAsync(
        this.userSpecialStatesRepository.updateFreeMicrodramaState(userId),
        Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(),
      );
    }

    return this.buildMicrodramaFreePreviewResponse(
      assignedMicrodrama,
      dialect,
      language,
    );
  }

  async postMicrodramaFreePreview(
    userId: string,
    dialect: Dialect,
    language: Lang,
    body: MicrodramaFreePreviewRequestDto,
  ): Promise<MicrodramaFreePreviewResponseDto> {
    const { content_id } = body;
    // get show details
    const showDetails =
      await this.showsService.getShowSlugByContentId(content_id);

    // get user states
    await this.errorHandler.raiseErrorIfExistsAsync(
      this.getAssignedMicrodrama(userId),
      Errors.USER.USER_ALREADY_ASSIGNED_FREE_CONTENT(),
    );
    // if state is not found, create a new state

    const userStates = await this.errorHandler.raiseErrorIfNullAsync(
      this.userSpecialStatesRepository.createFreeMicrodrama(
        userId,
        showDetails.slug,
      ),
      Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(),
    );

    const assignedMicrodrama = this.errorHandler.raiseErrorIfNull(
      userStates.free_microdrama,
      Errors.USER.USER_SPECIAL_STATES_NOT_FOUND(),
    );

    // return the response
    return this.buildMicrodramaFreePreviewResponse(
      assignedMicrodrama,
      dialect,
      language,
    );
  }

  async updateUserSpecialState(
    userId: string,
    dialect: Dialect,
    language: Lang,
    body: UpdateUserSpecialStateRequestDto,
  ): Promise<SpecialAccessResponseDto> {
    const { state_category, state_value } = body;

    const userStates = await this.getUserStatesOrThrow(userId);

    // Find matching state by episode_slug (not just first state)
    const matchingState = userStates.states.find(
      (state) =>
        (state.episode_slug && state.episode_slug.trim() !== '') ||
        (state.show_slug && state.show_slug.trim() !== ''),
    );

    if (!matchingState?.episode_slug && !matchingState?.show_slug) {
      throw new NotFoundException('User special state missing episode slug');
    }

    // Fetch ContentAssets and Episode in parallel
    const [contentAssets, episode] = await Promise.all([
      this.getCachedContentAssetsByEpisodeSlug(
        matchingState.episode_slug || matchingState.show_slug || '',
        language,
        ['_id', 'episode_slug', 'show_slug', 'content_type', 'states'],
        matchingState.content_type,
      ),
      matchingState.content_type === ContentType.SHOW
        ? this.showRepository.findOne(
            { displayLanguage: language, slug: matchingState.show_slug },
            ['_id', 'title', 'thumbnail', 'mediaList'],
            { cache: { enabled: true }, lean: true },
          )
        : this.episodeRepository.findOne(
            { displayLanguage: language, slug: matchingState.episode_slug },
            ['_id', 'title', 'thumbnail', 'mediaList'],
            { cache: { enabled: true }, lean: true },
          ),
    ]);

    if (!contentAssets) {
      throw new NotFoundException(
        `ContentAssets with episode_slug ${matchingState.episode_slug} and content_language ${language} not found`,
      );
    }

    if (!episode) {
      throw new NotFoundException(
        `Episode with slug ${matchingState.episode_slug} not found`,
      );
    }

    const isValidState = (contentAssets.states || []).some(
      (state) =>
        state.state_category === state_category &&
        state.state_value === state_value,
    );

    if (!isValidState) {
      throw new NotFoundException(
        `State with category ${state_category} and value ${state_value} not found in ContentAssets`,
      );
    }

    await this.userSpecialStatesRepository.updateFirstState(userId, {
      state_category,
      state_value,
      updated_at: new Date(),
    });

    return this.buildSpecialAccessResponse(
      contentAssets,
      episode,
      dialect,
      language,
      state_category,
      state_value,
    );
  }
}
