import { Prop, Schema } from '@nestjs/mongoose';

import {
  ChatbotAssetsSchema,
  CommitmentBoostDiscoverySchema,
  DiscoveryBoostSchema,
} from '../schema/contentAssets.schema';
import {
  MicrodramaFreePreviewSchema,
  OfferPageSchema,
  StateSchema,
  WebOfferPageSchema,
} from '../schema/specialAccess.schema';
import { BaseModel } from './base.entity';
import { ContentFormat } from './contents.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';
import { PaymentSuccessPageRecommendedContentSchema } from 'common/schema/assetV2.schema';

@Schema({ _id: false, collection: 'contentAssets', timestamps: true })
export class ContentAssets extends BaseModel<number> {
  @Prop({ required: true, type: Number })
  declare _id: number;

  @Prop({ type: ChatbotAssetsSchema })
  chatbot_assets?: ChatbotAssetsSchema;

  @Prop({ type: CommitmentBoostDiscoverySchema })
  commitment_boost_discovery?: CommitmentBoostDiscoverySchema;

  @Prop({ enum: Dialect, required: true, type: String })
  content_dialect!: Dialect;

  @Prop({ enum: ContentFormat, required: true, type: String })
  content_format!: ContentFormat;

  @Prop({ required: true, type: Number })
  content_id!: number;

  @Prop({ enum: Lang, required: true, type: String })
  content_language!: Lang;

  @Prop({ enum: ContentType, required: true })
  content_type!: ContentType;

  @Prop({ type: DiscoveryBoostSchema })
  discovery_boost_discovery?: DiscoveryBoostSchema;

  @Prop({ required: true, type: String })
  episode_slug!: string;

  @Prop({ type: MicrodramaFreePreviewSchema })
  microdrama_preview?: MicrodramaFreePreviewSchema;

  @Prop({ type: [PaymentSuccessPageRecommendedContentSchema] })
  payment_success_page_recommended_content?: PaymentSuccessPageRecommendedContentSchema[];

  @Prop({ type: String })
  show_slug?: string;

  @Prop({ type: OfferPageSchema })
  special_access?: OfferPageSchema;

  @Prop({ type: [StateSchema] })
  states?: StateSchema[];

  @Prop({ type: WebOfferPageSchema })
  web_special_access?: WebOfferPageSchema;
}
