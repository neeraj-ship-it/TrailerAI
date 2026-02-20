import { ContentType } from '../../../common/enums/common.enums';
import {
  SpecialAccessAssetType,
  SpecialAccessCtaAction,
} from '../../../common/schema/specialAccess.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
// Reusable nested DTOs
export interface TextWithColorDto {
  color: string;
  text: string;
}

export interface CtaDto {
  action: SpecialAccessCtaAction;
  bg_color: string;
  prefix_icon?: string;
  text: string;
  text_color: string;
}

export interface VideoPositionsWithoutClaimDto {
  start_watching_button: number;
  thumbnail: number;
}
export interface VideoPositionsDto extends VideoPositionsWithoutClaimDto {
  claim_button: number;
}

export interface AnimationDurationsDto {
  gift: number;
  start_watching: number;
  thumbnail: number;
}

export interface SpecialAccessContentThumbnailDto {
  horizontal?: string;
  square?: string;
  vertical?: string;
}

// Offer page specific DTOs
export interface OfferPageDto {
  animation_durations: AnimationDurationsDto;
  asset_type: SpecialAccessAssetType;
  asset_url: string;
  asset_url_without_claim: string;
  cta_claim: CtaDto;
  cta_start_watching: CtaDto;
  thumbnail_bottom_factor: string;
  thumbnail_width_factor: string;
  video_positions: VideoPositionsDto;
  video_positions_without_claim: VideoPositionsWithoutClaimDto;
}

// Floating banner DTO
export interface FloatingBannerDto {
  cta: CtaDto;
  description: string;
  image?: string;
  title: string;
}

// Hook clip DTO
export interface HookClipDto {
  asset_type: SpecialAccessAssetType;
  asset_url: string;
  cta: CtaDto;
  description?: TextWithColorDto;
  tag_text?: string;
  tag_url?: string;
  title?: TextWithColorDto;
}

// Expandable widget DTO
export interface ExpandableWidgetDto {
  cta: CtaDto;
  description?: TextWithColorDto;
  expanded_image?: string;
  title?: TextWithColorDto;
  title_image?: string;
}

// Non-expandable widget DTO
export interface NonExpandableWidgetDto {
  cta?: CtaDto;
  description?: TextWithColorDto;
  title?: TextWithColorDto;
  title_image?: string;
}

// Platter DTO
export interface PlatterDto {
  asset_type?: SpecialAccessAssetType;
  asset_url?: string;
  cta: CtaDto;
  tag_url: string;
}

// Content DTO
export interface SpecialAccessContentDto {
  all_ids: number[];
  id: number;
  slug: string;
  thumbnail: SpecialAccessContentThumbnailDto;
  title: string;
  trailer?: string;
  type: ContentType;
  watch_duration?: number;
}

// State DTO - categories
export enum StateCategoryDto {
  CLAIMED = 'claimed',
  CONSUMPTION = 'consumption',
  INITIAL = 'initial',
  TERMINAL = 'terminal',
}

// Initial state
export interface InitialStateDto {
  floating_banner?: FloatingBannerDto;
  offer_page: OfferPageDto;
  slot?: number;
  state_category: StateCategoryDto;
  state_value: number;
}

// Claimed state
export interface ClaimedStateDto {
  floating_banner?: FloatingBannerDto;
  platter?: PlatterDto;
  slot?: number;
  state_category: StateCategoryDto;
  state_value: number;
  thumbnail_tag_url?: string;
}

// First, Second, Third states(have same structure)
export interface ProgressStateDto {
  consumption_tag_text?: string;
  expandable_widget?: ExpandableWidgetDto;
  floating_banner?: FloatingBannerDto;
  hook_clip?: HookClipDto;
  non_expandable_widget?: NonExpandableWidgetDto;
  platter?: PlatterDto;
  slot: number;
  state_category: StateCategoryDto;
  state_value: number;
  thumbnail_tag_url?: string;
}

// Terminal state
export interface TerminalStateDto {
  expandable_widget?: ExpandableWidgetDto;
  floating_banner?: FloatingBannerDto;
  hook_clip?: HookClipDto;
  platter?: PlatterDto;
  slot: number;
  state_category: StateCategoryDto;
  state_value: number;
  thumbnail_tag_url?: string;
}

// Explicit state DTO - combines all possible fields from all state types
export interface SpecialAccessStateDto {
  consumption_tag_text?: string;
  expandable_widget?: ExpandableWidgetDto;
  floating_banner?: FloatingBannerDto;
  hook_clip?: HookClipDto;
  non_expandable_widget?: NonExpandableWidgetDto;
  offer_page?: OfferPageDto;
  platter?: PlatterDto;
  slot?: number;
  state_category: StateCategoryDto;
  state_value: number;
  thumbnail_tag_url?: string;
}

// Main response DTO
export interface SpecialAccessResponseDto {
  content: SpecialAccessContentDto;
  current_state_category: StateCategoryDto;
  current_state_slot?: number;
  current_state_value: number;
  states: SpecialAccessStateDto[];
}

export interface HeadingDto {
  animated_heading: string;
  primary: string;
  secondary: string;
}

export interface WebOfferPageContentDto {
  thumbnail: SpecialAccessContentThumbnailDto;
  title: string;
}
export interface WebOfferPageResponseDto {
  content: WebOfferPageContentDto;
  cta: CtaDto;
  full_screen_background_image: string;
  gift_box_gif: string;
  gift_box_image: string;
  gift_box_open: string;
  headings: HeadingDto;
  highlighted_background_image: string;
  login_screen_heading: TextWithColorDto;
}
export interface ContentBannerDto {
  cta: CtaDto;
}

// Common interface for cta and heading
export interface CtaHeadingFieldsDto {
  cta: CtaDto;
  heading: TextWithColorDto;
}

export interface HomePageFloatingBannerDto extends CtaHeadingFieldsDto {
  banner_bg_color: string;
}

export interface RewatchOverlayDto extends CtaHeadingFieldsDto {
  secondary_cta: CtaDto;
}

export interface MicrodramaFreePreviewContentDto {
  id: number;
  slug: string;
  thumbnail: Thumbnail;
  title: string;
}

export interface PreviewThresholdsDto {
  banner_unlock_percent: number;
  preview_end_overlay_percent: number;
  show_banner_episode_id: number;
}

export interface MicrodramaOfferPageDto {
  offer_page_load_time: number;
  sub_title: string;
  top_text: string;
}

// Microdrama free preview response DTO
export interface MicrodramaFreePreviewResponseDto {
  content: MicrodramaFreePreviewContentDto;
  content_banner: ContentBannerDto;
  download_overlay: CtaHeadingFieldsDto;
  free_preview_content: number[];
  free_preview_ended_overlay: CtaHeadingFieldsDto;
  free_preview_tag: string;
  home_page_floating_banner: HomePageFloatingBannerDto;
  is_free_preview_ended: boolean;
  lock_ribbon: string;
  offer_page: MicrodramaOfferPageDto;
  preview_thresholds: PreviewThresholdsDto;
  rewatch_overlay: RewatchOverlayDto;
  unlock_episode_tag: string;
}
