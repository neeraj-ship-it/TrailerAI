import { Prop, Schema } from '@nestjs/mongoose';

import { ContentType } from '../enums/common.enums';

// Enums
export enum StateCategory {
  CLAIMED = 'claimed',
  CONSUMPTION = 'consumption',
  INITIAL = 'initial',
  TERMINAL = 'terminal',
}

export enum SpecialAccessCtaAction {
  CHECKOUT = 'checkout',
  LANDSCAPE_CONSUMPTION = 'landscape_consumption',
  OFFER_PAGE = 'offer_page',
  PORTRAIT_CONSUMPTION = 'portrait_consumption',
  SPECIAL_ACCESS_PAYWALL = 'special_access_paywall',
}

export enum SpecialAccessAssetType {
  GIF = 'gif',
  IMAGE = 'image',
  VIDEO = 'video',
}

// User special access schema
@Schema({ _id: false })
export class SpecialAccessSchema {
  @Prop({ enum: StateCategory, type: String })
  category?: StateCategory;

  @Prop({ type: Number })
  contentId?: number;

  @Prop({ enum: ContentType, type: String })
  contentType?: ContentType;

  @Prop({ type: Number })
  value?: number;
}

// Reusable nested sub-schemas for Offer Page
@Schema({ _id: false })
export class TextWithColorSchema {
  @Prop({ required: true, type: String })
  color!: string;

  @Prop({ required: true, type: String })
  text!: string;
}

@Schema({ _id: false })
export class CtaSchema {
  @Prop({
    default: SpecialAccessCtaAction.LANDSCAPE_CONSUMPTION,
    enum: SpecialAccessCtaAction,
    required: true,
    type: String,
  })
  action!: SpecialAccessCtaAction;

  @Prop({ required: true, type: String })
  bg_color!: string;

  @Prop({ type: String })
  prefix_icon?: string;

  @Prop({ required: true, type: String })
  text!: string;

  @Prop({ required: true, type: String })
  text_color!: string;
}

@Schema({ _id: false })
export class VideoPositionsWithoutClaimSchema {
  @Prop({ required: true, type: Number })
  start_watching_button!: number;

  @Prop({ required: true, type: Number })
  thumbnail!: number;
}

@Schema({ _id: false })
export class VideoPositionsSchema extends VideoPositionsWithoutClaimSchema {
  @Prop({ required: true, type: Number })
  claim_button!: number;
}

@Schema({ _id: false })
export class AnimationDurationsSchema {
  @Prop({ required: true, type: Number })
  gift!: number;

  @Prop({ required: true, type: Number })
  start_watching!: number;

  @Prop({ required: true, type: Number })
  thumbnail!: number;
}

@Schema({ _id: false })
export class HeadingSchema {
  @Prop({ required: true, type: String })
  animated_heading!: string;

  @Prop({ required: true, type: String })
  primary!: string;

  @Prop({ required: true, type: String })
  secondary!: string;
}
@Schema({ _id: false })
export class OfferPageSchema {
  @Prop({ required: true, type: AnimationDurationsSchema })
  animation_durations!: AnimationDurationsSchema;

  @Prop({ enum: SpecialAccessAssetType, required: true, type: String })
  asset_type!: SpecialAccessAssetType;

  @Prop({ required: true, type: String })
  asset_url!: string;

  @Prop({ required: true, type: String })
  asset_url_without_claim!: string;

  @Prop({ required: true, type: CtaSchema })
  cta_claim!: CtaSchema;

  @Prop({ required: true, type: CtaSchema })
  cta_start_watching!: CtaSchema;

  @Prop({ type: String })
  thumbnail_bottom_factor!: number;

  @Prop({ type: String })
  thumbnail_width_factor!: number;

  @Prop({ required: true, type: VideoPositionsSchema })
  video_positions!: VideoPositionsSchema;

  @Prop({ required: true, type: VideoPositionsWithoutClaimSchema })
  video_positions_without_claim!: VideoPositionsWithoutClaimSchema;
}

@Schema({ _id: false })
export class WebOfferPageSchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: String })
  full_screen_background_image!: string;

  @Prop({ required: true, type: String })
  gift_box_gif!: string;

  @Prop({ required: true, type: String })
  gift_box_image!: string;

  @Prop({ required: true, type: String })
  gift_box_open!: string;

  @Prop({ required: true, type: HeadingSchema })
  headings!: HeadingSchema;

  @Prop({ required: true, type: String })
  highlighted_background_image!: string;

  @Prop({ required: true, type: String })
  login_screen_heading!: TextWithColorSchema;
}
// Common configuration for all platforms
@Schema({ _id: false })
export class CommonForPlatformsSchema {
  @Prop({ required: true, type: OfferPageSchema })
  offer_page!: OfferPageSchema;
}

// Floating banner schema used inside states
@Schema({ _id: false })
export class FloatingBannerSchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: String })
  description!: string;

  @Prop({ type: String })
  image?: string;

  @Prop({ required: true, type: String })
  title!: string;
}

// Hook clip schema (kept for future states; not used in initial state)
@Schema({ _id: false })
export class HookClipSchema {
  @Prop({ enum: SpecialAccessAssetType, required: true, type: String })
  asset_type!: SpecialAccessAssetType;

  @Prop({ required: true, type: String })
  asset_url!: string;

  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ type: TextWithColorSchema })
  description?: TextWithColorSchema;

  @Prop({ type: String })
  tag_text?: string;

  @Prop({ type: String })
  tag_url?: string;

  @Prop({ type: TextWithColorSchema })
  title?: TextWithColorSchema;
}

// Expandable widget schema
@Schema({ _id: false })
export class ExpandableWidgetSchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ type: TextWithColorSchema })
  description?: TextWithColorSchema;

  @Prop({ type: String })
  expanded_image?: string;

  @Prop({ type: TextWithColorSchema })
  title?: TextWithColorSchema;

  @Prop({ type: String })
  title_image?: string;
}

// Non-expandable widget schema
@Schema({ _id: false })
export class NonExpandableWidgetSchema {
  @Prop({ type: CtaSchema })
  cta?: CtaSchema;

  @Prop({ type: TextWithColorSchema })
  description?: TextWithColorSchema;

  @Prop({ type: TextWithColorSchema })
  title?: TextWithColorSchema;

  @Prop({ type: String })
  title_image?: string;
}

// Platter schema
@Schema({ _id: false })
export class PlatterSchema {
  @Prop({ enum: SpecialAccessAssetType, type: String })
  asset_type?: SpecialAccessAssetType;

  @Prop({ type: String })
  asset_url?: string;

  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: String })
  tag_url!: string;
}

// Initial state schema (offer_page required)
@Schema({ _id: false })
export class InitialStateSchema {
  @Prop({ type: FloatingBannerSchema })
  floating_banner?: FloatingBannerSchema;

  @Prop({ required: true, type: OfferPageSchema })
  offer_page!: OfferPageSchema;

  @Prop({ type: Number })
  slot?: number;

  @Prop({ enum: StateCategory, required: true, type: String })
  state_category!: StateCategory;

  @Prop({ required: true, type: Number })
  state_value!: number;
}

// Progress/Terminal state schema (widgets optional; slot required)
@Schema({ _id: false })
export class ProgressOrTerminalStateSchema {
  @Prop({ type: String })
  consumption_tag_text?: string;

  @Prop({ type: ExpandableWidgetSchema })
  expandable_widget?: ExpandableWidgetSchema;

  @Prop({ type: FloatingBannerSchema })
  floating_banner?: FloatingBannerSchema;

  @Prop({ type: HookClipSchema })
  hook_clip?: HookClipSchema;

  @Prop({ type: NonExpandableWidgetSchema })
  non_expandable_widget?: NonExpandableWidgetSchema;

  @Prop({ type: PlatterSchema })
  platter?: PlatterSchema;

  @Prop({ required: true, type: Number })
  slot!: number;

  @Prop({ enum: StateCategory, required: true, type: String })
  state_category!: StateCategory;

  @Prop({ required: true, type: Number })
  state_value!: number;

  @Prop({ type: String })
  thumbnail_tag_url?: string;
}

// Claimed state schema (inherits base only)
@Schema({ _id: false })
export class ClaimedStateSchema {
  @Prop({ type: FloatingBannerSchema })
  floating_banner?: FloatingBannerSchema;

  @Prop({ type: PlatterSchema })
  platter?: PlatterSchema;

  @Prop({ type: Number })
  slot?: number;

  @Prop({ enum: StateCategory, required: true, type: String })
  state_category!: StateCategory;

  @Prop({ required: true, type: Number })
  state_value!: number;

  @Prop({ type: String })
  thumbnail_tag_url?: string;
}

// Unified state schema (superset to allow array storage). Consumers should
// use state_name to interpret specific shapes.
@Schema({ _id: false })
export class StateSchema {
  @Prop({ type: String })
  consumption_tag_text?: string;

  @Prop({ type: ExpandableWidgetSchema })
  expandable_widget?: ExpandableWidgetSchema;

  @Prop({ type: FloatingBannerSchema })
  floating_banner?: FloatingBannerSchema;

  @Prop({ type: HookClipSchema })
  hook_clip?: HookClipSchema;

  @Prop({ type: NonExpandableWidgetSchema })
  non_expandable_widget?: NonExpandableWidgetSchema;

  @Prop({ type: OfferPageSchema })
  offer_page?: OfferPageSchema;

  @Prop({ type: PlatterSchema })
  platter?: PlatterSchema;

  @Prop({ type: Number })
  slot?: number;

  @Prop({ enum: StateCategory, required: true, type: String })
  state_category!: StateCategory;

  @Prop({ required: true, type: Number })
  state_value!: number;

  @Prop({ type: String })
  thumbnail_tag_url?: string;
}

// Microdrama free preview schema

@Schema({ _id: false })
export class DownloadOverlaySchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: TextWithColorSchema })
  heading!: TextWithColorSchema;
}

@Schema({ _id: false })
export class FreePreviewEndedOverlaySchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: TextWithColorSchema })
  heading!: TextWithColorSchema;
}

@Schema({ _id: false })
export class HomePageFloatingBannerSchema {
  @Prop({ required: true, type: String })
  banner_bg_color!: string;

  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: TextWithColorSchema })
  heading!: TextWithColorSchema;
}

@Schema({ _id: false })
export class RewatchOverlaySchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;

  @Prop({ required: true, type: TextWithColorSchema })
  heading!: TextWithColorSchema;

  @Prop({ required: true, type: CtaSchema })
  secondary_cta!: CtaSchema;
}

@Schema({ _id: false })
export class ContentBannerSchema {
  @Prop({ required: true, type: CtaSchema })
  cta!: CtaSchema;
}

@Schema({ _id: false })
export class PreviewThresholdsSchema {
  @Prop({ required: true, type: Number })
  banner_unlock_percent!: number;

  @Prop({ required: true, type: Number })
  preview_end_overlay_percent!: number;
}

@Schema({ _id: false })
export class MicrodramaOfferPageSchema {
  @Prop({ required: true, type: Number })
  offer_page_load_time!: number;

  @Prop({ required: true, type: String })
  sub_title!: string;

  @Prop({ required: true, type: String })
  top_text!: string;
}

export class MicrodramaFreePreviewSchema {
  @Prop({ required: true, type: ContentBannerSchema })
  content_banner!: ContentBannerSchema;

  @Prop({ required: true, type: DownloadOverlaySchema })
  download_overlay!: DownloadOverlaySchema;

  @Prop({ required: true, type: Number })
  free_preview_end_time!: number;

  @Prop({ required: true, type: FreePreviewEndedOverlaySchema })
  free_preview_ended_overlay!: FreePreviewEndedOverlaySchema;

  @Prop({ required: true, type: String })
  free_preview_tag!: string;

  @Prop({ required: true, type: String })
  free_preview_text!: string;

  @Prop({ required: true, type: HomePageFloatingBannerSchema })
  home_page_floating_banner!: HomePageFloatingBannerSchema;

  @Prop({ required: true, type: String })
  lock_ribbon!: string;

  @Prop({ required: true, type: MicrodramaOfferPageSchema })
  microdrama_offer_page!: MicrodramaOfferPageSchema;

  @Prop({ required: true, type: PreviewThresholdsSchema })
  preview_thresholds!: PreviewThresholdsSchema;

  @Prop({ required: true, type: RewatchOverlaySchema })
  rewatch_overlay!: RewatchOverlaySchema;

  @Prop({ required: true, type: String })
  unlock_episode_tag!: string;
}
