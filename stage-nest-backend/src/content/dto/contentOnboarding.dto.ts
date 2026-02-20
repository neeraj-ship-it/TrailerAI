import { OnboardingContentType } from '../entities/contentCategoryOnboardingMapping.entity';
import { OnboardingAction } from '../entities/userOnboardingPreference.entity';
import {
  FlashCardsState,
  RewardType,
} from '../entities/userOnboardingState.entity';
import { ThumbnailWithRatioDto } from './thumbnail.dto';

// Basic DTOs for API requests and responses
export interface OnboardingCategoryListDto {
  categories: OnboardingCategoryDto[];
  hasUserSwiped: boolean;
  totalCategories: number;
  userSwipedCount: number;
}

export interface OnboardingCategoryDto {
  categoryDescription: string;
  categoryId: number;
  categoryName: string;
  categoryThumbnail: string;
  totalContent: number;
  userAction?: string | null; // 'LIKE', 'DISLIKE', or null
}

export interface UserOnboardingCategoryActionDto {
  action: OnboardingAction;
  categoryId: number;
}

export interface UserOnboardingPreferenceResponseDto {
  categorySwipes: {
    categoryId: number;
    categoryName: string;
    action: OnboardingAction;
    swipedAt: Date;
    swipeOrder: number;
  }[];
  dislikedCategories: string[];
  dislikedCategoryIds: number[];
  isOnboardingComplete: boolean;
  lastActivity: Date;
  lastSwipeAt?: Date;
  likedCategories: string[];
  likedCategoryIds: number[];
  onboardingCompletedAt?: Date;
  profileId: string;
  rankingState: RankingStateDto;
  totalSwipes: number;
  userId: string;
}

export interface RankingStateDto {
  currentRank: number;
  hasCompletedRanking: boolean;
  progressPercentage: number;
  showLeaderboard: boolean;
}

export interface ContentFilterDto {
  contentType?: OnboardingContentType;
  limit?: number;
  slug?: string;
}

export interface RecommendedContentDto {
  categoryName: string;
  categoryNames: string[];
  cityAttributed?: string[];
  contentId: number;
  contentType: OnboardingContentType;
  metaCategories: { icon: string; value: string }[];
  overlay: string;
  playbackURL: string;
  priorityOrder: number;
  slug: string;
  thumbnail: ThumbnailWithRatioDto;
  title: string;
  viewCountString?: string;
}

export interface RecommendedContentListDto {
  categoryIds: number[];
  content: RecommendedContentDto[];
  endTime: Date | null;
  iconUrls: string[];
  isBasedOnUserPreferences: boolean;
  message: string;
  motivatorText: string;
  motivatorTextPrefix: string;
  totalContent: number;
  urgencyText: string;
  urgencyTextPrefix: string;
}

export interface UpdateContentProgressDto {
  contentId: number;
  contentType: OnboardingContentType;
  slug: string;
  watchedPercentage: number;
}

export interface UserOnboardingStateResponseDto {
  activeDaysCount: number;
  contentDiscoveryState: {
    hasViewedAnyContent: boolean;
    lastViewedContentSlug?: string;
    lastContentViewAt?: Date;
    contentProgress: {
      slug: string;
      progress: number;
      lastWatchedAt: Date;
      thumbnail: ThumbnailWithRatioDto;
    }[];
  };
  contentProgressState: {
    hasViewedAnyContent: boolean;
    totalContentViewed: number;
    completedContent: number;
    overallConsumptionPercentage: number;
  };
  currentState: string;
  flashCardsState: {
    hasSwipedAnyCard: boolean;
    hasSwipedAllCards: boolean;
    cardsSwiped: number;
    totalCards: number;
    totalCardsAvailable: number;
    currentCardIndex: number;
  };
  isUserEligibleForOnboardingPopup: boolean;
  lastUpdated: Date;
  nextAction: {
    action: string;
    description: string;
  };
  profileId: string;
  progressPercentage: number;
  rankingState: {
    currentRank?: number;
    progressPercentage: number;
    hasCompletedRanking: boolean;
    showLeaderboard: boolean;
  };
  rewards: {
    totalRewards: number;
    unCollectedRewards: number;
    medalCount: number;
    nextRewardType?: RewardType;
  };
  rewardsState: {
    rewards: { type: string; earnedAt: Date }[];
    activeDays: number;
    hasAllThreeMedals: boolean;
    hasAllMedals: boolean;
  };
  showLandingScreenOnAppOpen: boolean;
  userId: string;
}

export interface OnboardingLandingPageDto {
  contentDiscoveryMessage: string;
  contentDiscoveryState: {
    hasViewedAnyContent: boolean;
    lastViewedContentSlug?: string;
    lastContentViewAt?: Date;
    contentProgress: {
      contentType: OnboardingContentType;
      slug: string;
      progress: number;
      lastWatchedAt: Date;
      thumbnail: ThumbnailWithRatioDto;
    }[];
  };
  continueWatchingContent?: {
    slug: string;
    title: string;
    progress: number;
    thumbnail: ThumbnailWithRatioDto;
    contentId: number;
  };
  flashCardsState: FlashCardsState;
  overallProgress: number;
  recommendedContent?: RecommendedContentDto;
  rewardsSection: {
    medalCount: number;
    nextRewardType?: RewardType;
    recentAchievement?: string;
    rewards: { type: string; earnedAt: Date }[];
  };
}

export interface HomePageWidgetDto {
  ctaText: string;
  description: string;
  isVisible: boolean;
  title: string;
  widgetType: 'onboarding' | 'content_discovery' | 'rewards';
}

export interface ContentTagDto {
  color?: string;
  icon?: string;
  id: number;
  name: { en: string; hin: string };
}

export interface ContentWithTagsDto {
  contentSlug: string;
  contentType: OnboardingContentType;
  priorityOrder: number;
  tags: ContentTagDto[];
}

export interface GetContentByCategoryResponseDto {
  categoryId: string;
  categoryName?: { en: string; hin: string };
  contentItems: ContentWithTagsDto[];
}

export interface GetAllContentResponseDto {
  contentItems: ContentWithTagsDto[];
}

export interface OnboardingFlashCardResponseDto {
  categories: string[];
  content: string;
  id: number;
}

export interface OnboardingContentDiscoveryResponseDto {
  categories: string[];
  consumptionState: string;
  contentSlug: string;
  contentType: string;
  progress: number;
  swipeAction?: string;
}

export interface OnboardingRecommendationResponseDto {
  categories: string[];
  contentSlug: string;
  contentType: string;
  reason: string;
  score: number;
}

export interface OnboardingStateResponseDto {
  completedSections: string[];
  contentDiscoveryCompleted: number;
  currentSection: string;
  currentStep: number;
  flashCardsCompleted: number;
  isCompleted: boolean;
  nextAction: string;
  progress: number;
  rewards: {
    medals: number;
    totalPoints: number;
    achievements: string[];
  };
  totalSteps: number;
}

export interface OnboardingHomeWidgetResponseDto {
  actionText: string;
  description: string;
  isVisible: boolean;
  progress: number;
  title: string;
}

export interface GetOnboardingCategoriesQueryDto {
  feature?: string;
}
