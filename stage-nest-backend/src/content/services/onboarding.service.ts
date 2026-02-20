import { Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@nestjs/common';

import {
  ContentFilterDto,
  GetAllContentResponseDto,
  GetContentByCategoryResponseDto,
  HomePageWidgetDto,
  OnboardingCategoryListDto,
  OnboardingLandingPageDto,
  RankingStateDto,
  RecommendedContentDto,
  RecommendedContentListDto,
  UpdateContentProgressDto,
  UserOnboardingCategoryActionDto,
  UserOnboardingPreferenceResponseDto,
  UserOnboardingStateResponseDto,
} from '../dto/contentOnboarding.dto';
import { ThumbnailWithRatioDto } from '../dto/thumbnail.dto';
import {
  ContentCategoryOnboardingMapping,
  OnboardingContentType,
  OnboardingStatus,
} from '../entities/contentCategoryOnboardingMapping.entity';
import {
  CategorySwipe,
  OnboardingAction,
  UserOnboardingPreference,
} from '../entities/userOnboardingPreference.entity';
import {
  ContentConsumptionState,
  ContentProgress,
  FlashCardsState,
  OnboardingFlowState,
  RankingMilestone,
  RewardType,
  UserOnboardingState,
  UserReward,
} from '../entities/userOnboardingState.entity';
import { ContentCategoryOnboardingMappingRepository } from '../repositories/contentCategoryOnboardingMapping.repository';
import { ContentOnboardingCategoryRepository } from '../repositories/contentOnboardingCategory.repository';
import { EpisodesRepository } from '../repositories/episode.repository';
import { ShowRepository } from '../repositories/show.repository';
import { UserOnboardingPreferenceRepository } from '../repositories/userOnboardingPreference.repository';
import { UserOnboardingStateRepository } from '../repositories/userOnboardingState.repository';
import { CacheManagerService } from '@app/cache-manager';
import { OnboardingAssets } from '@app/common/constants/assets.constant';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { MediaFilePathUtils } from '@app/common/utils/media-file.utils';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { APP_CONFIGS } from 'common/configs/app.config';
import { StringConstants } from 'common/constants/string.constant';
import {
  ContentType,
  UserSubscriptionHistoryStatusEnum,
} from 'common/enums/common.enums';
import { PeripheralMediaType } from 'common/enums/media.enum';
import {
  ExperimentName,
  OnboardingHomeScreenExperimentValue,
} from 'src/users/dtos/experiment.dto';
import { ExperimentService } from 'src/users/services/experiment.service';
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  constructor(
    private readonly contentMappingRepository: ContentCategoryOnboardingMappingRepository,
    private readonly categoryRepository: ContentOnboardingCategoryRepository,
    private readonly userPreferenceRepository: UserOnboardingPreferenceRepository,
    public readonly userStateRepository: UserOnboardingStateRepository,
    private readonly showRepository: ShowRepository,
    private readonly episodeRepository: EpisodesRepository,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly experimentService: ExperimentService,
  ) {}

  private async addExperimentValuesToContentResponse(
    response: {
      categoryIds: number[];
      content: RecommendedContentDto[];
      isBasedOnUserPreferences: boolean;
      message: string;
      totalContent: number;
    },
    lang: Lang,
    userId: string,
  ): Promise<{
    categoryIds: number[];
    content: RecommendedContentDto[];
    isBasedOnUserPreferences: boolean;
    message: string;
    totalContent: number;
    iconUrls: string[];
    motivatorText: string;
    motivatorTextPrefix: string;
    urgencyTextPrefix: string;
    urgencyText: string;
    endTime: Date | null;
  }> {
    const iconUrls = [
      OnboardingAssets.FEMALE_PROFILE,
      OnboardingAssets.MALE_PROFILE_1,
      OnboardingAssets.MALE_PROFILE_2,
    ];

    const { metaCategory, motivatorText, urgencyText } =
      StringConstants.getStrings(lang);

    // Add metaCategories to each content item
    const contentWithMetaCategories = response.content.map((item) => {
      const metaCategoryEnriched = metaCategory.replace(
        '%s',
        item.cityAttributed?.[0] || 'India',
      );

      const metaCategories = [
        {
          icon: OnboardingAssets.FIRE_ICON,
          value: metaCategoryEnriched,
        },
      ];

      return {
        ...item,
        metaCategories,
      };
    });

    const motivatorTextPrefix = OnboardingAssets.EYE_ICON;
    const urgencyTextPrefix = OnboardingAssets.CLOCK_ICON;
    const CONTENT_CUTOFF_TIME_KEY = 'contentCutoffTimeOnboarding_' + userId;

    const contentCutoffData = await this.cacheManagerService.get<{
      endTime: string;
      hasBeenReset: boolean;
    }>(CONTENT_CUTOFF_TIME_KEY);
    let endTime: Date | null = null;

    if (contentCutoffData) {
      console.log('contentCutoffData', contentCutoffData);

      const cutoffTime = new Date(contentCutoffData.endTime);
      const now = new Date();
      const hasBeenReset = contentCutoffData.hasBeenReset || false;

      // Check if the time is in the past
      if (cutoffTime <= now) {
        if (!hasBeenReset) {
          // First time reset: set to 6 hours from now and mark as reset
          endTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          await this.cacheManagerService.set(
            CONTENT_CUTOFF_TIME_KEY,
            {
              endTime: endTime.toISOString(),
              hasBeenReset: true,
            },
            APP_CONFIGS.CACHE.TTL.TEN_DAYS,
          );
        } else {
          // Already been reset and expired - clear the data and return null
          endTime = null;
        }
      } else {
        // Time is in the future - use it as is
        endTime = cutoffTime;
      }
    } else {
      // No existing cutoff time, set to 24 hours from now
      endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.cacheManagerService.set(
        CONTENT_CUTOFF_TIME_KEY,
        {
          endTime: endTime.toISOString(),
          hasBeenReset: false,
        },
        APP_CONFIGS.CACHE.TTL.TEN_DAYS,
      );
    }

    return {
      ...response,
      content: contentWithMetaCategories,
      endTime,
      iconUrls,
      motivatorText,
      motivatorTextPrefix,
      urgencyText,
      urgencyTextPrefix,
    };
  }

  private async addRewardsForUser(
    userId: string,
    rewardType: RewardType,
    description: string,
  ): Promise<void> {
    // check if user is eligible for onboarding reward
    const { isActive } = await this.hasActiveTrialSubscriptionOrNewUser(userId);
    if (!isActive) {
      return;
    }

    await this.userStateRepository.addReward(userId, userId, {
      achievedAt: new Date(),
      description,
      isCollected: false,
      type: rewardType,
    });
  }

  private async addViewCountStrings(
    mappedContent: RecommendedContentDto[],
    lang: Lang,
  ): Promise<RecommendedContentDto[]> {
    return mappedContent.map((item, index) => {
      let viewCountString: string;
      if (index === 1) {
        viewCountString = StringConstants.getStrings(lang).viewCount1;
      } else {
        viewCountString = StringConstants.getStrings(lang).viewCount2;
      }

      return {
        ...item,
        viewCountString,
      };
    });
  }

  private calculateOnboardingProgressPercentage(
    state: UserOnboardingState,
  ): number {
    /**
     * Calculates overall onboarding progress based on milestones
     * Returns the HIGHEST eligible progress regardless of order
     *
     * Milestone Progression:
     * - No swipes: 0%
     * - Some swipes: 10%
     * - All swipes: 40%
     * - Any content started: 50%
     * - First medal: 60%
     * - Second medal: 70%
     * - Third medal: 80%
     * - Four days active (4th medal): 100%
     */

    let progress = 0;

    // Check each milestone independently and take the highest

    // Milestone 1: Some swipes (10%)
    if (state.hasSwipedAnyCard) {
      progress = Math.max(progress, 10);
    }

    // Milestone 2: All swipes completed (40%)
    if (state.hasSwipedAllCards) {
      progress = Math.max(progress, 40);
    }

    // Milestone 3: Any content started (50%)
    if (state.hasViewedAnyContent) {
      progress = Math.max(progress, 50);
    }

    // Milestone 4-7: Based on medals/rewards earned
    const rewardCount = state.rewards?.length || 0;

    if (rewardCount >= 1) {
      progress = Math.max(progress, 60); // First medal
    }

    if (rewardCount >= 2) {
      progress = Math.max(progress, 70); // Second medal
    }

    if (rewardCount >= 3) {
      progress = Math.max(progress, 80); // Third medal
    }

    // Milestone 8: Four days active OR 4+ medals (100%)
    const hasFourDaysActiveReward = state.rewards?.some(
      (r) => r.type === RewardType.ACTIVE_4_DAYS,
    );

    if (hasFourDaysActiveReward || rewardCount >= 4) {
      progress = Math.max(progress, 100);
    }

    return progress;
  }

  private calculateOverallConsumptionPercentage(
    contentProgress: ContentProgress[],
  ): number {
    if (contentProgress.length === 0) return 0;

    const totalPercentage = contentProgress.reduce(
      (sum, progress) => sum + progress.watchedPercentage,
      0,
    );
    return Math.round(totalPercentage / contentProgress.length);
  }

  private determineNextAction(state: {
    hasSwipedAnyCard?: boolean;
    hasSwipedAllCards?: boolean;
    hasViewedAnyContent?: boolean;
  }): {
    action: string;
    description: string;
  } {
    if (!state.hasSwipedAnyCard) {
      return {
        action: 'swipe_cards',
        description: 'Select your favorite content categories',
      };
    }
    if (!state.hasSwipedAllCards) {
      return {
        action: 'complete_cards',
        description: 'Complete your category selection',
      };
    }
    if (!state.hasViewedAnyContent) {
      return {
        action: 'watch_content',
        description: 'Start watching recommended content',
      };
    }
    return {
      action: 'continue_journey',
      description: 'Continue your content journey',
    };
  }

  private generateRandomRank(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async getContentDetails(
    contentType: OnboardingContentType,
    slug: string,
    lang: Lang,
  ): Promise<{
    slug: string;
    title: string;
    thumbnail: ThumbnailWithRatioDto;
    contentId: number;
    playbackURL: string;
  }> {
    let title: string;
    let thumbnail: ThumbnailWithRatioDto;
    let contentId: number;
    let playbackURL: string;

    if (contentType === OnboardingContentType.SHOW) {
      const show = await this.errorHandler.raiseErrorIfNullAsync(
        this.showRepository.findActiveShowBySlugForAllFormats(
          {
            displayLanguage: lang,
            slug: slug,
          },
          ['thumbnail', 'title', '_id', 'slug', 'mediaList'],
        ),
        Errors.SHOW.NOT_FOUND(),
      );
      title = show.title;
      thumbnail = show.thumbnail;
      contentId = show._id;
      const selectedClip =
        show.mediaList?.find(
          (media) => media.mediaType === PeripheralMediaType.CLIP,
        ) || show.mediaList?.[0];

      const { playbackURLH264 } =
        MediaFilePathUtils.generatePeripheralPlaybackURL({
          contentType: ContentType.SHOW,
          hls265SourceLink:
            selectedClip?.visionularHlsH265?.hlsSourcelink || '',
          hlsSourceLink: selectedClip?.visionularHls?.hlsSourcelink || '',
          slug: show.slug,
        });
      playbackURL = playbackURLH264;
    } else {
      const episode = await this.errorHandler.raiseErrorIfNullAsync(
        this.episodeRepository.findActiveMovieBySlug(
          { displayLanguage: lang, slug: slug },
          ['thumbnail', 'title', '_id', 'slug', 'mediaList'],
        ),
        Errors.MOVIE.NOT_FOUND(),
      );
      title = episode.title;
      thumbnail = episode.thumbnail;
      contentId = episode._id;
      const selectedClip =
        episode.mediaList?.find(
          (media) => media.mediaType === PeripheralMediaType.CLIP,
        ) || episode.mediaList?.[0];

      const { playbackURLH264 } =
        MediaFilePathUtils.generatePeripheralPlaybackURL({
          contentType: ContentType.MOVIE,
          hls265SourceLink:
            selectedClip?.visionularHlsH265?.hlsSourcelink || '',
          hlsSourceLink: selectedClip?.visionularHls?.hlsSourcelink || '',
          slug: episode.slug,
        });
      playbackURL = playbackURLH264;
    }

    return {
      contentId,
      playbackURL,
      slug,
      thumbnail,
      title,
    };
  }

  private getContentDiscoveryMessage(state: string): string {
    switch (state) {
      case 'continue_watching':
        return 'Continue watching where you left off';
      case 'start_watching':
        return 'Start watching your next recommended content';
      case 'success':
        return "Congratulations! You're on track";
      default:
        return 'Discover content tailored for you';
    }
  }

  private getNextRewardType(
    rewards: UserReward[] = [],
  ): RewardType | undefined {
    // if (rewards.length === 0) return RewardType.CONSUMPTION_40_PERCENT;
    // // if user has watched 40% return consumption 90%
    // if (!rewards.some((r) => r.type === RewardType.CONSUMPTION_90_PERCENT))
    //   return RewardType.CONSUMPTION_90_PERCENT;

    // if user has watched nothing return watched 1 complete content
    if (rewards.length === 0) return RewardType.WATCHED_1_COMPLETE_CONTENT;
    // if user has watched 40% return watched 1 complete content
    if (!rewards.some((r) => r.type === RewardType.WATCHED_2_COMPLETE_CONTENT))
      return RewardType.WATCHED_2_COMPLETE_CONTENT;
    // if user has watched 90% return active 4 days
    if (!rewards.some((r) => r.type === RewardType.ACTIVE_4_DAYS))
      return RewardType.ACTIVE_4_DAYS;

    return undefined;
  }

  private async getRankingState(userId: string): Promise<RankingStateDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Ensure user has rank initialized

    // Get user state
    let userState = await this.userStateRepository.findByUserId(userId);

    if (!userState) {
      await this.initializeUserRank(userId);
      // raise error if user state is still null
      userState = await this.errorHandler.raiseErrorIfNullAsync(
        this.userStateRepository.findByUserId(userId),
        Errors.CONTENT.ONBOARDING.STATE_NOT_FOUND(),
      );
    }

    const currentRank = userState.currentRank;
    const progressPercentage = userState.progressPercentage;
    const hasCompletedRanking = userState.hasCompletedRanking;

    return {
      currentRank,
      hasCompletedRanking,
      progressPercentage,
      showLeaderboard: !hasCompletedRanking,
    };
  }

  // Get user onboarding state for inactive trial to prevent unnecessary DB operations
  private getUserOnboardingStateForInactiveTrial(
    userId: string,
  ): UserOnboardingStateResponseDto {
    return {
      activeDaysCount: 0,
      contentDiscoveryState: {
        contentProgress: [],
        hasViewedAnyContent: false,
      },
      contentProgressState: {
        completedContent: 0,
        hasViewedAnyContent: false,
        overallConsumptionPercentage: 0,
        totalContentViewed: 0,
      },
      currentState: 'trial_required',
      flashCardsState: {
        cardsSwiped: 0,
        currentCardIndex: 0,
        hasSwipedAllCards: false,
        hasSwipedAnyCard: false,
        totalCards: 0,
        totalCardsAvailable: 0,
      },
      isUserEligibleForOnboardingPopup: false,
      lastUpdated: new Date(),
      nextAction: {
        action: 'activate_trial',
        description:
          'Active trial subscription required to continue your journey',
      },
      profileId: userId, // Use userId since onboarding is profile-agnostic
      progressPercentage: 0,
      rankingState: {
        hasCompletedRanking: false,
        progressPercentage: 0,
        showLeaderboard: false,
      },
      rewards: {
        medalCount: 0,
        totalRewards: 0,
        unCollectedRewards: 0,
      },
      rewardsState: {
        activeDays: 0,
        hasAllMedals: false,
        hasAllThreeMedals: false,
        rewards: [],
      },
      showLandingScreenOnAppOpen: false,
      userId,
    };
  }

  private async hasActiveTrialSubscriptionOrNewUser(userId: string): Promise<{
    isActive: boolean;
    isLatestSubscriptionTrialActive: boolean;
  }> {
    const latestSubscriptionHistory =
      await this.userSubscriptionHistoryRepository.findOne(
        { userId },
        ['isTrial', 'status', 'createdAt'],
        { lean: true, sort: { createdAt: -1 } },
      );

    const isLatestSubscriptionTrialActive =
      !!latestSubscriptionHistory?.isTrial &&
      latestSubscriptionHistory?.status ===
        UserSubscriptionHistoryStatusEnum.ACTIVE;
    const hasNoSubscriptionHistory = !latestSubscriptionHistory;

    return {
      isActive: isLatestSubscriptionTrialActive || hasNoSubscriptionHistory,
      isLatestSubscriptionTrialActive,
    };
  }

  private async initializeUserRank(userId: string): Promise<void> {
    // For onboarding, always use userId since it's profile-agnostic
    const state = await this.userStateRepository.findByUserId(userId);

    // Initialize rank if user has no rank or if user is completely new
    if (!state?.currentRank) {
      const initialRank = this.generateRandomRank(1300, 1400);
      await this.userStateRepository.updateRank(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        {
          currentRank: initialRank,
          hasCompletedRanking: false,
          progressPercentage: 15,
        },
      );
    }
  }

  private async isOnboardingJourneyComplete(userId: string): Promise<boolean> {
    // For onboarding, always use userId since it's profile-agnostic
    const state = await this.userStateRepository.findByUserId(userId);

    if (!state) return false;

    // Check if user has all 4 medals
    const hasAllMedals =
      state.rewards.length >=
      APP_CONFIGS.CONTENT_ONBOARDING.ONBOARDING_JOURNEY_COMPLETE_MEDALS_COUNT;

    // Check if user has viewed any content >90%
    // const hasViewedContentCompletely = state.contentProgress.some(
    //   (progress) => progress.watchedPercentage >= 90,
    // );
    // Removed this content >90% as discussed with product team for now as new medals have been added

    return hasAllMedals;
  }

  private async isUserEligibleForOnboardingHomeScreenExperiment(
    userId: string,
  ): Promise<boolean> {
    try {
      const experiment = await this.experimentService.getExperiment(
        userId,
        ExperimentName.OnboardingHomeScreenExperiment,
      );

      if (!experiment.groupName) {
        return false;
      }

      const expValue =
        (experiment.value as OnboardingHomeScreenExperimentValue)
          .showLandingScreenOnAppOpen ?? false;

      return expValue;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to get Onboarding Home Screen Experiment from Statsig`,
      );
      return false;
    }
  }

  private async mapStateToDto(
    state: UserOnboardingState,
    isUserEligibleForOnboardingPopup: boolean,
    lang: Lang,
    feature?: string,
  ): Promise<UserOnboardingStateResponseDto> {
    const isUserEligibleForExperiment = !state.contentProgress.some(
      (progress: ContentProgress) =>
        progress.watchedPercentage >=
        APP_CONFIGS.CONTENT_ONBOARDING
          .ONBOARDING_ENFORCEMENT_WATCHED_PERCENTAGE_LIMIT,
    );
    let showLandingScreenOnAppOpen = false;
    if (isUserEligibleForExperiment) {
      showLandingScreenOnAppOpen =
        await this.isUserEligibleForOnboardingHomeScreenExperiment(
          state.user.toString(),
        );
    }

    const nextAction = this.determineNextAction(state);

    // Calculate overall progress percentage
    const progressPercentage =
      this.calculateOnboardingProgressPercentage(state);

    // Filter content progress to only include content with onboarding mappings
    const onboardingContentProgress = [];
    for (const progressItem of state.contentProgress) {
      // Check if this content exists in onboarding mappings
      const mappings = await this.contentMappingRepository.findByContentSlug(
        progressItem.slug,
      );
      if (mappings && mappings.length > 0) {
        const contentDetails = await this.getContentDetails(
          progressItem.contentType,
          progressItem.slug,
          lang,
        );
        onboardingContentProgress.push({
          lastWatchedAt: progressItem.lastWatchedAt || new Date(),
          playbackURL: contentDetails.playbackURL,
          progress: progressItem.watchedPercentage,
          slug: progressItem.slug,
          thumbnail: contentDetails.thumbnail,
        });
      }
    }

    return {
      activeDaysCount: state.activeDays || 0,
      contentDiscoveryState: {
        contentProgress: onboardingContentProgress,
        hasViewedAnyContent: state.hasViewedAnyContent,
        lastContentViewAt: state.lastContentViewAt,
        lastViewedContentSlug: state.lastViewedContentSlug,
      },
      contentProgressState: {
        completedContent:
          state.contentProgress?.filter(
            (progressItem: ContentProgress) =>
              progressItem.watchedPercentage >= 90,
          ).length || 0,
        hasViewedAnyContent: state.hasViewedAnyContent,
        overallConsumptionPercentage:
          this.calculateOverallConsumptionPercentage(
            state.contentProgress || [],
          ),
        totalContentViewed: state.contentProgress?.length || 0,
      },
      currentState: state.currentState,
      flashCardsState: {
        cardsSwiped: state.cardsSwiped,
        currentCardIndex: state.currentCardIndex,
        hasSwipedAllCards:
          feature ===
          APP_CONFIGS.CONTENT_ONBOARDING.PRE_TRIAL_ONBOARDING_FEATURE
            ? state.cardsSwiped ===
              APP_CONFIGS.CONTENT_ONBOARDING
                .PRE_TRIAL_ONBOARDING_FEATURE_CARDS_COUNT
            : state.hasSwipedAllCards,
        hasSwipedAnyCard: state.hasSwipedAnyCard,
        totalCards: state.totalCardsAvailable,
        totalCardsAvailable: state.totalCardsAvailable,
      },
      isUserEligibleForOnboardingPopup,
      lastUpdated: new Date(),
      nextAction: nextAction,
      profileId: state.profile.toString(),
      progressPercentage: progressPercentage,
      rankingState: {
        currentRank: state.currentRank,
        hasCompletedRanking: state.hasCompletedRanking || false,
        progressPercentage: state.progressPercentage || 0,
        showLeaderboard: !state.hasCompletedRanking, // Hide leaderboard when ranking is completed
      },
      rewards: {
        medalCount: state.rewards?.length || 0,
        nextRewardType: this.getNextRewardType(state.rewards),
        totalRewards: state.rewards?.length || 0,
        unCollectedRewards:
          state.rewards?.filter((r: UserReward) => !r.isCollected).length || 0,
      },
      rewardsState: {
        activeDays: state.activeDays,
        hasAllMedals: state.hasAllMedals,
        hasAllThreeMedals: state.hasAllThreeMedals,
        rewards: state.rewards.map((r) => ({
          earnedAt: r.achievedAt,
          type: r.type,
        })),
      },
      showLandingScreenOnAppOpen,
      userId: state.user.toString(),
    };
  }

  // Private helper methods
  private async mapUserPreferenceToDto(
    preference: UserOnboardingPreference,
  ): Promise<UserOnboardingPreferenceResponseDto> {
    const rankingState = await this.getRankingState(preference.user.toString());

    return {
      categorySwipes: preference.categorySwipes.map((swipe: CategorySwipe) => ({
        action: swipe.action,
        categoryId: swipe.categoryId,
        categoryName: swipe.categoryName,
        swipedAt: swipe.swipedAt,
        swipeOrder: swipe.swipeOrder,
      })),
      dislikedCategories:
        preference.dislikedCategoryIds?.map((id: number) => id.toString()) ||
        [],
      dislikedCategoryIds: preference.dislikedCategoryIds,
      isOnboardingComplete: preference.isOnboardingComplete,
      lastActivity: preference.lastSwipeAt || new Date(),
      lastSwipeAt: preference.lastSwipeAt,
      likedCategories:
        preference.likedCategoryIds?.map((id: number) => id.toString()) || [],
      likedCategoryIds: preference.likedCategoryIds,
      onboardingCompletedAt: preference.onboardingCompletedAt,
      profileId: preference.profile.toString(),
      rankingState,
      totalSwipes: preference.totalSwipes,
      userId: preference.user.toString(),
    };
  }

  private async updateUserRank(
    userId: string,
    milestone: RankingMilestone,
  ): Promise<void> {
    // For onboarding, always use userId since it's profile-agnostic
    const state = await this.userStateRepository.findByUserId(userId);

    if (!state || state.hasCompletedRanking) {
      return; // Don't update if ranking is completed
    }

    // Milestone configuration for scalability
    const milestoneConfigs = {
      [RankingMilestone.FIRST_40_PERCENT]: {
        minRank: 900,
        progress: 35,
        rankRange: [800, 899],
        requiredReward: RewardType.CONSUMPTION_40_PERCENT,
      },
      [RankingMilestone.FIRST_90_PERCENT]: {
        minRank: 800,
        progress: 60,
        rankRange: [600, 699],
        requiredReward: RewardType.CONSUMPTION_90_PERCENT,
      },
      [RankingMilestone.FIRST_SWIPE]: {
        minRank: 1000,
        progress: 20,
        rankRange: [900, 999],
        requiredReward: RewardType.CONSUMPTION_40_PERCENT,
      },
      [RankingMilestone.FOUR_DAYS_ACTIVE]: {
        minRank: 600,
        progress: 80,
        rankRange: [500, 599],
        requiredReward: RewardType.ACTIVE_4_DAYS,
      },
      [RankingMilestone.WATCHED_1_COMPLETE_CONTENT]: {
        minRank: 900,
        progress: 35,
        rankRange: [800, 899],
        requiredReward: RewardType.WATCHED_1_COMPLETE_CONTENT,
      },
      [RankingMilestone.WATCHED_2_COMPLETE_CONTENT]: {
        minRank: 800,
        progress: 60,
        rankRange: [600, 699],
        requiredReward: RewardType.WATCHED_2_COMPLETE_CONTENT,
      },
    };

    // Check if all required milestones are achieved
    const requiredMilestones = [
      // RewardType.CONSUMPTION_40_PERCENT,
      // RewardType.CONSUMPTION_90_PERCENT,
      RewardType.WATCHED_1_COMPLETE_CONTENT,
      RewardType.WATCHED_2_COMPLETE_CONTENT,
      RewardType.ACTIVE_4_DAYS,
    ];

    const allMilestonesCompleted = requiredMilestones.every((milestoneType) =>
      state.rewards?.some((r) => r.type === milestoneType),
    );

    // Handle final rank assignment if all milestones completed
    if (allMilestonesCompleted) {
      if (!state.currentRank || state.currentRank > 100) {
        const finalRank = this.generateRandomRank(80, 100);
        await this.userStateRepository.updateRank(
          userId,
          userId, // Use userId as both parameters since onboarding is profile-agnostic
          {
            currentRank: finalRank,
            hasCompletedRanking: true,
            progressPercentage: 100,
          },
        );
      }
      return;
    }

    // Get milestone configuration
    const config = milestoneConfigs[milestone];
    if (!config) return;

    // Check if user can progress to this milestone
    if (!state.currentRank || state.currentRank >= config.minRank) {
      const newRank = this.generateRandomRank(
        config.rankRange[0],
        config.rankRange[1],
      );

      await this.userStateRepository.updateRank(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        {
          currentRank: newRank,
          hasCompletedRanking: false,
          progressPercentage: config.progress,
        },
      );
    }
  }

  private async validateContentExists(
    mapping: ContentCategoryOnboardingMapping,
    lang: Lang,
  ): Promise<boolean> {
    if (mapping.contentType === OnboardingContentType.SHOW) {
      const show = await this.showRepository.findActiveShowBySlugForAllFormats(
        {
          displayLanguage: lang,
          slug: mapping.contentSlug,
        },
        ['_id'],
      );
      return show !== null;
    }

    const episode = await this.episodeRepository.findActiveMovieBySlug(
      { displayLanguage: lang, slug: mapping.contentSlug },
      ['_id'],
    );
    return episode !== null;
  }

  // Add first watchlist reward for user
  checkAndAddFirstWatchlistReward(userId: string): void {
    const rewardType = RewardType.FIRST_WATCHLIST_ITEM;
    this.errorHandler.try(
      async () => {
        await this.addRewardsForUser(
          userId,
          rewardType,
          'Added your first item to watchlist!',
        );
      },
      (error) => {
        console.error(
          `Failed to add ${rewardType} reward for user ${userId}: ${error}`,
        );
      },
    );
  }

  // Check if user is eligible for onboarding popup based on subscription history
  async checkUserEligibilityForOnboardingPopup(
    userId: string,
  ): Promise<boolean> {
    try {
      // Get the latest subscription history record for this user
      const { isLatestSubscriptionTrialActive } =
        await this.hasActiveTrialSubscriptionOrNewUser(userId);

      const state = await this.userStateRepository.findByUserId(userId);

      // User is eligible if they have an active trial subscription and has completed at least 2 contents more than 60%
      const hasUserCompletedTwoContents =
        (state?.contentProgress?.filter((p) => p.watchedPercentage > 59)
          .length ?? 0) >= 2;
      if (hasUserCompletedTwoContents) {
        return false;
      }
      return isLatestSubscriptionTrialActive;
    } catch (error) {
      // Log error and return false as fallback
      console.warn(
        `Error checking active trial subscription for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  async deleteUserOnboardingPreference(userId: string): Promise<void> {
    await this.userPreferenceRepository.deleteUserOnboardingPreference(userId);
  }

  async deleteUserOnboardingState(userId: string): Promise<void> {
    await this.userStateRepository.deleteUserOnboardingState(userId);
  }

  async getAllContentWithCategories(
    dialect: Dialect,
  ): Promise<GetAllContentResponseDto> {
    // Get all active mappings
    const allMappings = await this.contentMappingRepository.find({
      dialect,
      status: 'active',
    });

    if (!allMappings || allMappings.length === 0) {
      return {
        contentItems: [],
      };
    }

    // Each mapping already contains all categories for that content
    const contentWithTags = await Promise.all(
      allMappings.map(async (mapping) => {
        // Get category details for all categoryIds in this mapping
        const tags = await Promise.all(
          mapping.categoryIds.map(async (catId) => {
            const cat = await this.categoryRepository.findById(catId);
            return cat
              ? {
                  color: cat.color,
                  icon: cat.categoryIcon,
                  id: cat._id,
                  name: cat.categoryName,
                }
              : null;
          }),
        );

        return {
          contentSlug: mapping.contentSlug,
          contentType: mapping.contentType,
          priorityOrder: mapping.priorityOrder,
          tags: tags.filter(
            (cat): cat is NonNullable<typeof cat> => cat !== null,
          ),
        };
      }),
    );

    return {
      contentItems: contentWithTags,
    };
  }

  async getContentByCategory(
    categoryId: string,
    dialect: Dialect,
  ): Promise<GetContentByCategoryResponseDto> {
    // Get all mappings for this category
    const mappings = await this.contentMappingRepository.find({
      categoryIds: Number(categoryId),
      dialect,
      status: 'active',
    });

    if (!mappings || mappings.length === 0) {
      return {
        categoryId,
        contentItems: [],
      };
    }

    // Get category details
    const category = await this.categoryRepository.findById(Number(categoryId));

    // Get content with their tags (all categories from categoryIds)
    const contentWithTags = await Promise.all(
      mappings.map(async (mapping) => {
        // Get category details for all categoryIds in this mapping
        const tags = await Promise.all(
          mapping.categoryIds.map(async (catId) => {
            const cat = await this.categoryRepository.findById(catId);
            return cat
              ? {
                  color: cat.color,
                  icon: cat.categoryIcon,
                  id: cat._id,
                  name: cat.categoryName,
                }
              : null;
          }),
        );

        return {
          contentSlug: mapping.contentSlug,
          contentType: mapping.contentType,
          priorityOrder: mapping.priorityOrder,
          tags: tags.filter(
            (cat): cat is NonNullable<typeof cat> => cat !== null,
          ),
        };
      }),
    );

    return {
      categoryId,
      categoryName: category?.categoryName,
      contentItems: contentWithTags,
    };
  }

  async getContentBySlug(
    contentSlug: string,
  ): Promise<ContentCategoryOnboardingMapping> {
    // Get mapping for this content
    const mappings =
      await this.contentMappingRepository.findByContentSlug(contentSlug);

    if (!mappings || mappings.length === 0) {
      throw new NotFoundException('Content not found');
    }

    // Use the first mapping (since all mappings for same content should have same categoryIds array)
    const mapping = mappings[0];

    // Get category details for all categoryIds
    // const tags = await Promise.all(
    //   mapping.categoryIds.map(async (catId) => {
    //     const category = await this.categoryRepository.findById(catId);
    //     return category
    //       ? {
    //           color: category.color,
    //           icon: category.categoryIcon,
    //           id: category._id,
    //           name: category.categoryName,
    //         }
    //       : null;
    //   }),
    // );

    return mapping;
  }

  // Get home page widget data
  async getHomePageWidget(userId: string): Promise<HomePageWidgetDto> {
    // For onboarding, always use userId since it's profile-agnostic
    const state = await this.userStateRepository.findByUserId(userId);

    // let nextStep:
    //   | 'flash_cards'
    //   | 'complete_flash_cards'
    //   | 'watch_content'
    //   | 'completed' = 'flash_cards';
    let nextStepDescription = 'Start your content discovery journey';

    if (!state?.hasSwipedAnyCard) {
      // nextStep = 'flash_cards';
      nextStepDescription = 'Select your favorite content categories';
    } else if (!state.hasSwipedAllCards) {
      // nextStep = 'complete_flash_cards';
      nextStepDescription = 'Complete selecting your preferences';
    } else if (!state.hasViewedAnyContent) {
      // nextStep = 'watch_content';
      nextStepDescription = 'Start watching recommended content';
    } else {
      // nextStep = 'completed';
      nextStepDescription = 'Continue your journey';
    }

    return {
      ctaText: 'Continue',
      description: nextStepDescription,
      isVisible: true,
      title: 'Continue Your Journey',
      widgetType: 'onboarding' as const,
    };
  }

  // Get all content categories for onboarding flash cards
  async getOnboardingCategories({
    dialect,
    feature,
    lang = Lang.EN,
    userId,
  }: {
    userId: string;
    lang: Lang;
    dialect: Dialect;
    feature?: string;
  }): Promise<OnboardingCategoryListDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Get active categories filtered by dialect from header
    let categories =
      await this.categoryRepository.findActiveCategories(dialect);

    if (!categories || categories.length === 0) {
      return {
        categories: [],
        hasUserSwiped: false,
        totalCategories: 0,
        userSwipedCount: 0,
      };
    }

    if (
      feature === APP_CONFIGS.CONTENT_ONBOARDING.PRE_TRIAL_ONBOARDING_FEATURE
    ) {
      categories = categories.slice(
        0,
        APP_CONFIGS.CONTENT_ONBOARDING.PRE_TRIAL_ONBOARDING_FEATURE_CARDS_COUNT,
      );
    }

    // Check user's swipe history
    const userPreference =
      await this.userPreferenceRepository.findByUserId(userId);
    const hasUserSwiped = userPreference
      ? userPreference.totalSwipes > 0
      : false;
    const userSwipedCount = userPreference ? userPreference.totalSwipes : 0;

    // Get sample content for each category
    const categoriesWithContent = await Promise.all(
      categories.map(async (category) => {
        // const sampleMappings =
        //   await this.contentMappingRepository.findContentByCategoryAndType(
        //     category._id,
        //     undefined,
        //     3,
        //   );

        // Find user's action for this category
        const userAction = userPreference?.categorySwipes.find(
          (swipe) => swipe.categoryId === category._id,
        )?.action;

        return {
          categoryDescription:
            category.categoryDescription[lang] ||
            category.categoryDescription.en,
          categoryId: category._id,
          categoryName: category.categoryName[lang] || category.categoryName.en,
          categoryThumbnail:
            MediaFilePathUtils.generateContentOnboardingCategoryThumbnailURL(
              category.categoryThumbnail[lang] || category.categoryThumbnail.en,
            ),
          totalContent:
            await this.contentMappingRepository.getContentCountByCategory(
              category._id,
              dialect,
            ),
          userAction: userAction, // 'LIKE', 'DISLIKE', or null if not swiped
        };
      }),
    );

    // Update onboarding state
    await this.userStateRepository.createOrUpdate(
      userId,
      userId, // Use userId as both parameters since onboarding is profile-agnostic
      {
        // currentState: FlashCardsState.FLASH_CARDS_PENDING,
        totalCardsAvailable: categoriesWithContent.length,
      },
    );

    return {
      categories: categoriesWithContent,
      hasUserSwiped,
      totalCategories: categoriesWithContent.length,
      userSwipedCount,
    };
  }

  // Get onboarding landing page data
  async getOnboardingLandingPage(
    userId: string,
    lang: Lang,
    dialect: Dialect,
  ): Promise<OnboardingLandingPageDto> {
    // For onboarding, always use userId since it's profile-agnostic
    const state = await this.userStateRepository.findByUserId(userId);
    // const preference =
    //   await this.userPreferenceRepository.findByProfileId(profileId);

    // Flash cards section
    let flashCardsState: FlashCardsState = FlashCardsState.FLASH_CARDS_PENDING;
    if (state?.hasSwipedAllCards) {
      flashCardsState = FlashCardsState.FLASH_CARDS_COMPLETED;
    } else if (state?.hasSwipedAnyCard) {
      flashCardsState = FlashCardsState.FLASH_CARDS_IN_PROGRESS;
    }

    // Content discovery section with priority-based logic
    let contentDiscoveryState:
      | 'default'
      | 'continue_watching'
      | 'start_watching'
      | 'success' = 'default';
    let recommendedContent: RecommendedContentDto | undefined;
    let continueWatchingContent: ContentProgress | undefined;

    // Only get recommended content if user has swiped at least one card
    let recommendations: RecommendedContentListDto | null = null;
    if (state?.hasSwipedAnyCard) {
      recommendations = await this.getRecommendedContent({
        dialect,
        filters: { limit: 10 }, // Get more recommendations to have options
        lang,
        userId,
      });
    }

    if (state?.hasViewedAnyContent && state.contentProgress.length > 0) {
      // Sort content by lastWatchedAt to get latest consumed first
      const sortedProgress = [...state.contentProgress].sort(
        (a, b) =>
          new Date(b.lastWatchedAt || 0).getTime() -
          new Date(a.lastWatchedAt || 0).getTime(),
      );

      // P1: Content >40% and <90% (highest priority for continue watching)
      const continueWatchingCandidates = sortedProgress.filter(
        (p) => p.watchedPercentage >= 40 && p.watchedPercentage < 90,
      );

      if (continueWatchingCandidates.length > 0) {
        // Choose latest consumed title within this condition
        const selectedContent = continueWatchingCandidates[0];
        contentDiscoveryState = 'continue_watching';
        continueWatchingContent = {
          consumptionState: selectedContent.consumptionState,
          contentId: selectedContent.contentId,
          contentType: selectedContent.contentType,
          isCompleted: selectedContent.isCompleted,
          lastWatchedAt: selectedContent.lastWatchedAt || new Date(),
          slug: selectedContent.slug,
          watchedPercentage: selectedContent.watchedPercentage,
        };
      } else {
        // P2: Content viewed but <40%
        const lowProgressCandidates = sortedProgress.filter(
          (p) => p.watchedPercentage > 0 && p.watchedPercentage < 40,
        );

        if (lowProgressCandidates.length > 0) {
          // Choose latest consumed title within this condition
          const selectedContent = lowProgressCandidates[0];
          contentDiscoveryState = 'continue_watching';
          continueWatchingContent = {
            consumptionState: selectedContent.consumptionState,
            contentId: selectedContent.contentId,
            contentType: selectedContent.contentType,
            isCompleted: selectedContent.isCompleted,
            lastWatchedAt: selectedContent.lastWatchedAt || new Date(),
            slug: selectedContent.slug,
            watchedPercentage: selectedContent.watchedPercentage,
          };
        } else {
          // P3: Content >90% - show next ranked content for start watching
          const completedCandidates = sortedProgress.filter(
            (p) => p.watchedPercentage >= 90,
          );

          if (completedCandidates.length > 0) {
            // Check if all content is completed
            const allCompleted = state.contentProgress.every(
              (p) => p.watchedPercentage >= 90,
            );

            if (allCompleted) {
              contentDiscoveryState = 'success';
            } else {
              contentDiscoveryState = 'start_watching';
            }
          }
        }
      }

      // For P1 and P2, prioritize continue watching content in recommendations
      // For P3, show unwatched content if available, otherwise show any recommendation
      if (
        contentDiscoveryState === 'start_watching' ||
        contentDiscoveryState === 'success'
      ) {
        // Get next recommended content (excluding already watched ones)
        const watchedSlugs = state.contentProgress.map((p) => p.slug);
        const unwatchedContent = recommendations?.content.find(
          (content) => !watchedSlugs.includes(content.slug),
        );

        if (unwatchedContent) {
          recommendedContent = unwatchedContent;
        } else if (recommendations && recommendations.content.length > 0) {
          // Fallback to first recommendation if all have been watched
          // Filter out content with same slug as continue watching content
          const nextRecommendations = recommendations.content.filter(
            (content) => content.slug !== continueWatchingContent?.slug,
          );
          recommendedContent =
            nextRecommendations[0] || recommendations.content[0];
        }
      } else if (
        continueWatchingContent &&
        recommendations?.content?.length &&
        recommendations?.content?.length > 0
      ) {
        // If we have continue watching content, filter content with same slug
        const filteredRecommendations = recommendations?.content?.filter(
          (content) => content.slug === continueWatchingContent?.slug,
        );
        recommendedContent =
          filteredRecommendations?.[0] || recommendations?.content?.[0];
      } else {
        // For continue watching states, show any recommended content
        if (recommendations && recommendations.content.length > 0) {
          recommendedContent = recommendations.content[0];
        }
      }
    } else {
      // Default state: User hasn't watched any content yet
      contentDiscoveryState = 'default';

      // Use the first recommendation for default state
      if (recommendations && recommendations.content.length > 0) {
        recommendedContent = recommendations.content[0];
      }
    }

    // Ensure we always have recommendedContent - fallback to creating a dummy one if needed
    // Only apply fallback if user has swiped cards but no recommendations found
    if (!recommendedContent && state?.hasSwipedAnyCard) {
      // Try to get any content from the database as fallback
      const fallbackContent = await this.contentMappingRepository.find({
        dialect,
        status: OnboardingStatus.ACTIVE,
      });

      if (fallbackContent && fallbackContent.length > 0) {
        // Validate fallback content and find the first valid one
        let validFallbackContent = null;
        for (const content of fallbackContent) {
          const isValid = await this.validateContentExists(content, lang);
          if (isValid) {
            validFallbackContent = content;
            break;
          }
        }

        if (validFallbackContent) {
          const contentDetails = await this.getContentDetails(
            validFallbackContent.contentType,
            validFallbackContent.contentSlug,
            lang,
          );

          // Get category for the content
          const category = await this.categoryRepository.findById(
            validFallbackContent.categoryIds[0],
          );

          recommendedContent = {
            categoryName:
              category?.categoryName[lang] ||
              category?.categoryName.en ||
              'Unknown Category',
            categoryNames: [
              category?.categoryName[lang] ||
                category?.categoryName.en ||
                'Unknown Category',
            ],
            cityAttributed: validFallbackContent.cityAttributed, // Include cityAttributed from fallback content
            contentId: contentDetails.contentId,
            contentType: validFallbackContent.contentType,
            metaCategories: [], // Temporary placeholder, will be set in addExperimentValuesToContentResponse
            overlay: MediaFilePathUtils.generateContentOnboardingOverlayURL(
              validFallbackContent?.overlay,
            ),
            playbackURL: contentDetails.playbackURL,
            priorityOrder: validFallbackContent.priorityOrder,
            slug: validFallbackContent.contentSlug,
            thumbnail: contentDetails.thumbnail,
            title: contentDetails.title,
          };
        }
      }
    }

    // If user hasn't swiped any cards, recommendedContent will be undefined
    // This is the expected behavior - no recommendations until cards are swiped

    return {
      contentDiscoveryMessage: this.getContentDiscoveryMessage(
        contentDiscoveryState,
      ),
      contentDiscoveryState: {
        contentProgress: await Promise.all(
          state?.contentProgress?.map(async (p) => {
            const contentDetails = await this.getContentDetails(
              p.contentType,
              p.slug,
              lang,
            );
            return {
              contentType: p.contentType,
              lastWatchedAt: p.lastWatchedAt || new Date(),
              progress: p.watchedPercentage,
              slug: p.slug,
              thumbnail: contentDetails.thumbnail,
            };
          }) || [],
        ),
        hasViewedAnyContent: state?.hasViewedAnyContent || false,
        lastContentViewAt: state?.lastContentViewAt,
        lastViewedContentSlug: state?.lastViewedContentSlug,
      },
      continueWatchingContent: continueWatchingContent
        ? {
            ...(await this.getContentDetails(
              continueWatchingContent.contentType,
              continueWatchingContent.slug,
              lang,
            )),
            progress: continueWatchingContent.watchedPercentage,
          }
        : undefined,
      flashCardsState,
      overallProgress: this.calculateOverallConsumptionPercentage(
        state?.contentProgress || [],
      ),
      ...(state?.hasSwipedAnyCard && recommendedContent
        ? { recommendedContent }
        : {}),
      rewardsSection: {
        medalCount: state?.rewards.length || 0,
        nextRewardType: this.getNextRewardType(state?.rewards),
        recentAchievement: state?.rewards[0]?.type, // Most recent achievement
        rewards:
          state?.rewards.map((r) => ({
            earnedAt: r.achievedAt,
            type: r.type,
          })) || [],
      },
    };
  }

  // Get recommended content based on user preferences
  async getRecommendedContent({
    dialect,
    filters,
    lang,
    userId,
  }: {
    userId: string;
    dialect: Dialect;
    lang: Lang;
    filters?: ContentFilterDto;
  }): Promise<RecommendedContentListDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Get user's liked categories
    const userPreference =
      await this.userPreferenceRepository.findByUserId(userId);
    const likedCategoryNames =
      userPreference?.categorySwipes
        .filter((swipe) => swipe.action === OnboardingAction.LIKE)
        .map((swipe) => swipe.categoryId) || [];

    let content: ContentCategoryOnboardingMapping[] = [];
    let isBasedOnUserPreferences = false;

    if (likedCategoryNames.length > 0) {
      // Get content from liked categories
      const query: {
        contentType?: OnboardingContentType;
        contentSlug?: RegExp;
        status: OnboardingStatus;
      } = { status: OnboardingStatus.ACTIVE };

      if (filters?.contentType) {
        query.contentType = filters.contentType;
      }

      if (filters?.slug) {
        query.contentSlug = new RegExp(filters.slug, 'i');
      }

      // Get category IDs for liked categories by matching category names
      const allCategories =
        await this.categoryRepository.findActiveCategories(dialect);

      const likedCategoryIds = allCategories
        .filter((cat) => {
          return likedCategoryNames.includes(cat._id);
        })
        .map((cat) => cat._id);

      if (likedCategoryIds.length > 0) {
        // Get content from liked categories
        const mappings = await this.contentMappingRepository.findByCategories(
          likedCategoryIds,
          dialect,
        );

        // Validate that content actually exists in shows/episodes collections
        const validatedMappings = await Promise.all(
          mappings.map(async (mapping) => {
            const exists = await this.validateContentExists(mapping, lang);
            return exists ? mapping : null;
          }),
        );

        let filteredMappings = validatedMappings.filter(
          (mapping): mapping is ContentCategoryOnboardingMapping =>
            mapping !== null,
        );

        if (filters?.contentType) {
          filteredMappings = filteredMappings.filter(
            (m) => m.contentType === filters.contentType,
          );
        }

        if (filters?.slug) {
          const slugRegex = new RegExp(filters.slug, 'i');
          filteredMappings = filteredMappings.filter((m) =>
            slugRegex.test(m.contentSlug),
          );
        }

        content = filteredMappings;
        isBasedOnUserPreferences = true;
      }
    }

    // If no content from preferences or no preferences, get global content
    if (content.length === 0) {
      const query: {
        contentType?: OnboardingContentType;
        contentSlug?: RegExp;
        status: OnboardingStatus;
        dialect: Dialect;
      } = {
        dialect,
        status: OnboardingStatus.ACTIVE,
      };

      if (filters?.contentType) {
        query.contentType = filters.contentType;
      }

      if (filters?.slug) {
        query.contentSlug = new RegExp(filters.slug, 'i');
      }

      const globalContent = await this.contentMappingRepository.find(query);

      // Validate that content actually exists in shows/episodes collections
      if (globalContent && globalContent.length > 0) {
        const validatedGlobalContent = await Promise.all(
          globalContent.map(async (mapping) => {
            const exists = await this.validateContentExists(mapping, lang);
            return exists ? mapping : null;
          }),
        );
        content = validatedGlobalContent.filter(
          (mapping): mapping is ContentCategoryOnboardingMapping =>
            mapping !== null,
        );
      } else {
        content = [];
      }
      isBasedOnUserPreferences = false;
    }

    // Sort by priority order and limit results
    content = content
      .sort((a, b) => a.priorityOrder - b.priorityOrder)
      .slice(0, filters?.limit || 6);

    // Get category information for the content
    const mappedContent: RecommendedContentDto[] = await Promise.all(
      content.map(async (item) => {
        // Get all categories for this content
        const categories = await Promise.all(
          item.categoryIds.map((catId) =>
            this.categoryRepository.findById(catId),
          ),
        );

        // Filter out null categories and get category names
        const validCategories = categories.filter(Boolean);
        const categoryNames = validCategories?.map((cat) => {
          if (!cat) return '';
          return cat.categoryName[lang] || cat.categoryName.en;
        });

        // Use first category for primary category name
        const primaryCategory = validCategories[0];
        const categoryName = primaryCategory
          ? primaryCategory.categoryName[lang] ||
            primaryCategory.categoryName.en
          : 'Unknown Category';

        const contentDetails = await this.getContentDetails(
          item.contentType,
          item.contentSlug,
          lang,
        );

        return {
          categoryName,
          categoryNames, // All category names this content belongs to
          cityAttributed: item.cityAttributed, // Include cityAttributed from the mapping
          contentId: contentDetails.contentId,
          contentType: item.contentType,
          metaCategories: [], // Temporary placeholder, will be set in addExperimentValuesToContentResponse
          overlay: MediaFilePathUtils.generateContentOnboardingOverlayURL(
            item.overlay,
          ),
          playbackURL: contentDetails.playbackURL,
          priorityOrder: item.priorityOrder,
          slug: item.contentSlug,
          thumbnail: contentDetails.thumbnail,
          title: contentDetails.title,
        };
      }),
    );

    const baseResponse = {
      categoryIds: [], // Not applicable with new structure
      content: mappedContent,
      isBasedOnUserPreferences,
      message: isBasedOnUserPreferences
        ? 'Based on your preferences'
        : 'Top content for you',
      totalContent: mappedContent.length,
    };

    // Add view count strings to content
    const responseWithViewCounts = await this.addViewCountStrings(
      baseResponse.content,
      lang,
    );

    // Add experiment values to the response
    const finalResponse = await this.addExperimentValuesToContentResponse(
      { ...baseResponse, content: responseWithViewCounts },
      lang,
      userId,
    );

    return finalResponse;
  }

  // Get user's onboarding state
  async getUserOnboardingState(
    userId: string,
    lang: Lang,
    feature?: string,
  ): Promise<UserOnboardingStateResponseDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Check if user has active trial subscription
    const { isActive } = await this.hasActiveTrialSubscriptionOrNewUser(userId);

    // If no active trial, return default state without making any DB operations
    if (!isActive) {
      return this.getUserOnboardingStateForInactiveTrial(userId);
    }

    // Initialize user rank if needed
    await this.initializeUserRank(userId);

    const isUserEligibleForOnboardingPopup =
      await this.checkUserEligibilityForOnboardingPopup(userId);

    const state = await this.userStateRepository.findByUserId(userId);

    if (!state) {
      // Create initial state
      const newState = await this.userStateRepository.createOrUpdate(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        {
          currentState: OnboardingFlowState.NOT_STARTED,
        },
      );
      return await this.mapStateToDto(
        newState,
        isUserEligibleForOnboardingPopup,
        lang,
        feature,
      );
    }

    return await this.mapStateToDto(
      state,
      isUserEligibleForOnboardingPopup,
      lang,
      feature,
    );
  }

  // Update content progress and handle rewards
  async updateContentProgress(
    userId: string,
    progressData: UpdateContentProgressDto,
    lang: Lang,
  ): Promise<UserOnboardingStateResponseDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Check if user has active trial subscription
    const { isActive } = await this.hasActiveTrialSubscriptionOrNewUser(userId);

    // If no active trial, reject the request to avoid unnecessary DB operations
    if (!isActive) {
      return this.getUserOnboardingStateForInactiveTrial(userId);
    }

    // Check if onboarding journey is already complete
    const isJourneyComplete = await this.isOnboardingJourneyComplete(userId);

    if (isJourneyComplete) {
      // Journey is complete, just return current state without making DB updates
      return this.getUserOnboardingState(userId, lang);
    }

    // Validate that the content exists in the database before updating progress
    if (progressData.contentType === OnboardingContentType.SHOW) {
      await this.errorHandler.raiseErrorIfNullAsync(
        this.showRepository.findActiveShowBySlugForAllFormats(
          {
            displayLanguage: lang,
            slug: progressData.slug,
          },
          ['_id', 'slug'],
        ),
        Errors.SHOW.NOT_FOUND(),
      );
    } else if (progressData.contentType === OnboardingContentType.MOVIE) {
      await this.errorHandler.raiseErrorIfNullAsync(
        this.episodeRepository.findActiveMovieBySlug(
          { displayLanguage: lang, slug: progressData.slug },
          ['_id', 'slug'],
        ),
        Errors.MOVIE.NOT_FOUND(),
      );
    }

    // Initialize user rank if needed
    await this.initializeUserRank(userId);

    // Get current state to check for existing progress
    const currentState = await this.userStateRepository.findByUserId(userId);

    // Find existing progress for this content (same slug and content type)
    const existingProgress = currentState?.contentProgress?.find(
      (p) =>
        p.slug === progressData.slug &&
        p.contentType === progressData.contentType,
    );

    // Calculate new accumulated progress
    const currentProgress = existingProgress?.watchedPercentage || 0;
    const accumulatedProgress = Math.min(
      100,
      currentProgress + progressData.watchedPercentage,
    );

    // Determine consumption state based on accumulated progress
    let consumptionState: ContentConsumptionState;
    const percentage = accumulatedProgress;

    if (percentage < 20) {
      consumptionState = ContentConsumptionState.VIEWED_LESS_THAN_20;
    } else if (percentage < 40) {
      consumptionState = ContentConsumptionState.VIEWED_20_TO_40;
    } else if (percentage < 90) {
      consumptionState = ContentConsumptionState.VIEWED_40_TO_90;
    } else {
      consumptionState = ContentConsumptionState.VIEWED_MORE_THAN_90;
    }

    const progress: ContentProgress = {
      consumptionState,
      contentId: progressData.contentId,
      contentType: progressData.contentType,
      isCompleted: percentage >= 90,
      lastWatchedAt: new Date(),
      slug: progressData.slug,
      watchedPercentage: percentage, // Use accumulated progress
    };

    // Check for rewards and ranking updates BEFORE updating progress
    // Check if this is the first time reaching each milestone
    // const isFirst40Percent = !currentState?.contentProgress?.some(
    //   (p) => p.watchedPercentage >= 40,
    // );
    // const isFirst90Percent = !currentState?.contentProgress?.some(
    //   (p) => p.watchedPercentage >= 90,
    // );

    // Helper function to count completed content of a specific type
    const getCompletedContentCount = (
      contentType: OnboardingContentType,
      requiredPercentage: number,
    ): number => {
      return (
        currentState?.contentProgress?.filter(
          (p) =>
            p.watchedPercentage >= requiredPercentage &&
            p.contentType === contentType,
        ).length || 0
      );
    };

    // Helper function to check if specific content has already been completed
    const isContentAlreadyCompleted = (
      contentId: number,
      contentType: OnboardingContentType,
      requiredPercentage: number,
    ): boolean => {
      return (
        currentState?.contentProgress?.some(
          (p) =>
            p.contentId === contentId &&
            p.contentType === contentType &&
            p.watchedPercentage >= requiredPercentage,
        ) || false
      );
    };

    // Calculate completed content count excluding the current content being processed
    const alreadyCompletedMoviesCount = getCompletedContentCount(
      OnboardingContentType.MOVIE,
      70,
    );

    const alreadyCompletedEpisodesCount = getCompletedContentCount(
      OnboardingContentType.SHOW,
      90,
    );

    // Subtract 1 if current content is already completed to avoid double counting
    const currentContentAlreadyCompleted = isContentAlreadyCompleted(
      progressData.contentId,
      progressData.contentType,
      progressData.contentType === OnboardingContentType.MOVIE ? 70 : 90,
    );

    const alreadyCompletedContentCount =
      alreadyCompletedMoviesCount +
      alreadyCompletedEpisodesCount -
      (currentContentAlreadyCompleted ? 1 : 0);

    // Update progress AFTER checking milestones
    await this.userStateRepository.updateContentProgress(
      userId,
      userId, // Use userId as both parameters since onboarding is profile-agnostic
      progress,
    );

    // Give rewards based on milestones achieved
    if (
      percentage >= 70 &&
      progressData.contentType === OnboardingContentType.MOVIE &&
      alreadyCompletedContentCount <= 1
    ) {
      await this.userStateRepository.addReward(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        {
          achievedAt: new Date(),
          description: 'Watched 1st movie!',
          isCollected: false,
          type:
            alreadyCompletedContentCount === 0
              ? RewardType.WATCHED_1_COMPLETE_CONTENT
              : RewardType.WATCHED_2_COMPLETE_CONTENT,
        },
      );

      // Update rank for first 40% consumption
      if (alreadyCompletedContentCount === 0) {
        await this.updateUserRank(
          userId,
          RankingMilestone.WATCHED_1_COMPLETE_CONTENT,
        );
      }

      if (alreadyCompletedContentCount === 1) {
        await this.updateUserRank(
          userId,
          RankingMilestone.WATCHED_2_COMPLETE_CONTENT,
        );
      }
    }

    if (
      percentage >= 90 &&
      progressData.contentType === OnboardingContentType.SHOW &&
      alreadyCompletedContentCount <= 1
    ) {
      await this.userStateRepository.addReward(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        {
          achievedAt: new Date(),
          description: 'Watched 1st episode!',
          isCollected: false,
          type:
            alreadyCompletedContentCount === 0
              ? RewardType.WATCHED_1_COMPLETE_CONTENT
              : RewardType.WATCHED_2_COMPLETE_CONTENT,
        },
      );

      // Update rank for first 90% consumption
      if (alreadyCompletedContentCount === 0) {
        await this.updateUserRank(
          userId,
          RankingMilestone.WATCHED_1_COMPLETE_CONTENT,
        );
      }
      if (alreadyCompletedContentCount === 1) {
        await this.updateUserRank(
          userId,
          RankingMilestone.WATCHED_2_COMPLETE_CONTENT,
        );
      }
    }

    // Update active days
    const beforeActiveDays = currentState?.activeDays || 0;
    await this.userStateRepository.updateActiveDays(
      userId,
      userId, // Use userId as both parameters since onboarding is profile-agnostic
    );

    // Check if user just reached 4 active days for ranking update
    const afterState = await this.userStateRepository.findByUserId(userId);
    if (beforeActiveDays < 4 && (afterState?.activeDays || 0) >= 4) {
      await this.updateUserRank(userId, RankingMilestone.FOUR_DAYS_ACTIVE);
    }

    // Check if journey is now complete after this update
    const updatedState = await this.getUserOnboardingState(userId, lang);
    const finalState = await this.userStateRepository.findByUserId(userId);

    if (finalState && finalState.hasAllMedals) {
      // Mark onboarding as completed
      await this.userStateRepository.updateFlowState(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        OnboardingFlowState.ONBOARDING_COMPLETED,
      );
    }

    return updatedState;
  }

  // Handle user swipe action on category
  async userActionOnCategory(
    userId: string,
    swipeData: UserOnboardingCategoryActionDto,
    lang: Lang = Lang.EN,
    dialect: Dialect,
  ): Promise<UserOnboardingPreferenceResponseDto> {
    // For onboarding, always use userId since it's profile-agnostic

    // Check if onboarding journey is already complete
    const isJourneyComplete = await this.isOnboardingJourneyComplete(userId);

    if (isJourneyComplete) {
      // Journey is complete, return existing preferences without updates
      const existingPreference =
        await this.userPreferenceRepository.findByUserId(userId);
      if (existingPreference) {
        return this.mapUserPreferenceToDto(existingPreference);
      }
      // If no existing preference found but journey is complete, throw error
      throw new NotFoundException('User has completed onboarding journey');
    }

    // Get categories to find the category name by ID
    const categories = await this.getOnboardingCategories({
      dialect,
      lang,
      userId,
    });
    const category = categories.categories.find(
      (c) => c.categoryId === swipeData.categoryId,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Initialize user rank if needed
    await this.initializeUserRank(userId);

    // // Check if this is the first Swipe action for ranking
    // const currentState =
    //   await this.userStateRepository.findByProfileId(normalizedProfileId);

    // Get existing preferences to check if this is the first LIKE
    const existingPreference =
      await this.userPreferenceRepository.findByUserId(userId);
    const isFirstLike =
      swipeData.action === OnboardingAction.LIKE &&
      (!existingPreference ||
        !existingPreference.categorySwipes.some(
          (swipe) => swipe.action === OnboardingAction.LIKE,
        ));

    // Create category swipe record
    const categorySwipe: CategorySwipe = {
      action: swipeData.action,
      categoryId: swipeData.categoryId,
      categoryName: category.categoryName,
      swipedAt: new Date(),
      swipeOrder: 0, // Will be set by repository
    };

    // Update user preferences
    const preference = await this.userPreferenceRepository.createOrUpdate(
      userId,
      userId, // Use userId as both parameters since onboarding is profile-agnostic
      categorySwipe,
    );

    const totalCards = categories.totalCategories;

    // totalSwipes now accurately represents unique categories swiped
    const uniqueCategoriesSwiped = preference.totalSwipes;

    // Update onboarding state
    await this.userStateRepository.updateFlashCardState(
      userId,
      userId, // Use userId as both parameters since onboarding is profile-agnostic
      {
        cardsSwiped: uniqueCategoriesSwiped,
        currentCardIndex: uniqueCategoriesSwiped,
        hasSwipedAllCards: uniqueCategoriesSwiped >= totalCards,
        hasSwipedAnyCard: true,
      },
    );

    // Update flow state if all cards swiped
    if (uniqueCategoriesSwiped >= totalCards) {
      await this.userStateRepository.updateFlowState(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        FlashCardsState.FLASH_CARDS_COMPLETED,
      );
    } else {
      await this.userStateRepository.updateFlowState(
        userId,
        userId, // Use userId as both parameters since onboarding is profile-agnostic
        FlashCardsState.FLASH_CARDS_IN_PROGRESS,
      );
    }

    // Update rank for first LIKE action
    if (isFirstLike) {
      await this.updateUserRank(userId, RankingMilestone.FIRST_SWIPE);
    }

    return this.mapUserPreferenceToDto(preference);
  }
}
