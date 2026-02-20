import {
  SpecialAccessStateDto,
  TextWithColorDto,
} from './specialAccess.response.dto';
import {
  ChatbotAssetCtaAction,
  ChatbotAssetType,
} from 'common/schema/contentAssets.schema';

export interface ChatbotAssetCtaDto {
  action: ChatbotAssetCtaAction;
  bg_color: string;
  text: string;
  text_color: string;
}

export interface ChatbotAssetDrawerDto {
  asset_type: ChatbotAssetType;
  asset_url: string;
  cta: ChatbotAssetCtaDto;
}

export interface ChatbotAssetStartChatIconDto {
  action: ChatbotAssetCtaAction;
  asset_type: ChatbotAssetType;
  asset_url: string;
  characters_carousel_images: string[];
}

export interface CommitmentBoostDiscoveryDrawerDto {
  asset_type: ChatbotAssetType;
  asset_url: string;
  keep_watching_button_text: string;
  landscape_heading_text: string;
  landscape_sub_heading_text: string;
  more_suggestions_button_text: string;
  title?: TextWithColorDto;
  trial_ends_in_text: string;
}

export interface DiscoveryBoostDiscoveryDrawerDto {
  asset_type: ChatbotAssetType;
  asset_url: string;
  heading_text: string;
  start_watching_button_text: string;
  title?: TextWithColorDto;
  trial_ends_in_text: string;
}

export interface DiscoveryBoostDiscoveryBottomSheetDto {
  heading_text: string;
  start_watching_button_text: string;
  trial_ends_in_text: string;
}

export interface DiscoveryBoostDiscoveryDto {
  bottom_sheet: DiscoveryBoostDiscoveryBottomSheetDto;
  drawer: DiscoveryBoostDiscoveryDrawerDto;
}

export interface CommitmentBoostDiscoveryDto {
  drawer: CommitmentBoostDiscoveryDrawerDto;
}

export interface ChatbotAssetsResponseDto {
  drawer: ChatbotAssetDrawerDto;
  redirect_url?: string;
  start_chat_icon: ChatbotAssetStartChatIconDto;
}

export interface ContentAssetsResponseDto {
  chatbot_assets?: ChatbotAssetsResponseDto;
  commitment_boost_discovery?: CommitmentBoostDiscoveryDto;
  discovery_boost_discovery?: DiscoveryBoostDiscoveryDto;
  states?: SpecialAccessStateDto[];
}
