import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Dialect, Lang } from '../enums/app.enum';
import {
  MicrodramaFreePreviewSchema,
  OfferPageSchema,
  WebOfferPageSchema,
} from '../schema/specialAccess.schema';
import { BaseModel } from './base.entity';
import {
  AssetsV2CommitmentBoostDiscoverySchema,
  AssetsV2DiscoveryBoostSchema,
  PaymentSuccessPageRecommendedContentSchema,
} from 'common/schema/assetV2.schema';
import { ChatbotAssetsSchema } from 'common/schema/contentAssets.schema';

export enum FeatureEnum {
  CHATBOT = 'chatbot_assets',
  COMMITMENT_BOOST_DISCOVERY = 'commitment_boost_discovery',
  DISCOVERY_BOOST = 'discovery_boost_discovery',
  MICRO_DRAMA_FREE_PREVIEW = 'microdrama_preview',
  PAYMENT_SUCCESS_PAGE_RECOMMENDED_CONTENT = 'payment_success_page_recommended_content',
  SPECIAL_ACCESS = 'special_access',
}

// Acceptable schema type - can contain offer_page for special_access or microdrama properties for micro_drama_free_preview
@Schema({ _id: false })
export class FeatureItems {
  @Prop({ type: ChatbotAssetsSchema })
  chatbot_assets?: ChatbotAssetsSchema;

  @Prop({ type: AssetsV2CommitmentBoostDiscoverySchema })
  commitment_boost_discovery?: AssetsV2CommitmentBoostDiscoverySchema;

  @Prop({ type: AssetsV2DiscoveryBoostSchema })
  discovery_boost_discovery?: AssetsV2DiscoveryBoostSchema;

  @Prop({ type: MicrodramaFreePreviewSchema })
  microdrama_preview?: MicrodramaFreePreviewSchema;

  @Prop({ type: [PaymentSuccessPageRecommendedContentSchema] })
  payment_success_page_recommended_content?: PaymentSuccessPageRecommendedContentSchema[];

  @Prop({ type: OfferPageSchema })
  special_access?: OfferPageSchema;

  @Prop({ type: WebOfferPageSchema })
  web_special_access?: WebOfferPageSchema;
}

// Platform-specific configuration (android, ios, web, tv, commonForPlatforms)
@Schema({ _id: false })
export class PlatformConfig {
  // Platform buckets can contai  n OfferPageSchema or be null

  @Prop({ type: FeatureItems })
  android!: FeatureItems;

  // Accept OfferPageSchema or null - can be changed in the future
  @Prop({ type: FeatureItems })
  commonForPlatforms!: FeatureItems;

  @Prop({ type: FeatureItems })
  ios!: FeatureItems;

  @Prop({ type: FeatureItems })
  tv!: FeatureItems;

  @Prop({ type: FeatureItems })
  web!: FeatureItems;
}

// Language-specific configuration (hin, en, commonForLangs with nested platforms)
@Schema({ _id: false })
export class LanguageWithPlatformConfig {
  // Can contain OfferPageSchema or be null
  @Prop({ type: FeatureItems })
  commonForLangs!: FeatureItems;

  @Prop({ type: PlatformConfig })
  [Lang.EN]!: PlatformConfig;

  @Prop({ type: PlatformConfig })
  [Lang.HIN]!: PlatformConfig;
}

export const LanguageWithPlatformConfigSchema = SchemaFactory.createForClass(
  LanguageWithPlatformConfig,
);

// Main AssetsV2 Entity
@Schema({ collection: 'assetsV2', timestamps: true })
export class AssetsV2 extends BaseModel<number> {
  // Common configuration across all dialects
  @Prop({ type: LanguageWithPlatformConfig })
  commonForDialects!: LanguageWithPlatformConfig;

  // Dialect-specific configurations with nested language and platform structure
  // Automatically handles all dialects from Dialect enum (BHO, GUJ, HAR, RAJ)
  @Prop({
    of: LanguageWithPlatformConfigSchema,
    type: LanguageWithPlatformConfig,
  })
  dialects!: Record<Dialect, LanguageWithPlatformConfig>;

  @Prop({ enum: FeatureEnum, required: true, type: String })
  feature!: FeatureEnum;

  // Version tracking
  @Prop({ default: 'generic', required: true, type: String })
  variant!: string;
}
