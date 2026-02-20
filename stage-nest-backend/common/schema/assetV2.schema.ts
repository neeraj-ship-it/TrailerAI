import { Prop, Schema } from '@nestjs/mongoose';

import { ContentType } from 'common/enums/common.enums';

@Schema({ _id: false })
export class AssetsV2CommitmentBoostDiscoveryDrawerSchema {
  @Prop({ type: String })
  keep_watching_button_text!: string;

  @Prop({ required: true, type: String })
  landscape_heading_text!: string;

  @Prop({ required: true, type: String })
  landscape_sub_heading_text!: string;

  @Prop({ type: String })
  more_suggestions_button_text!: string;

  @Prop({ type: String })
  trial_ends_in_text!: string;
}

@Schema({ _id: false })
export class AssetsV2DiscoveryBoostDrawerSchema {
  @Prop({ type: String })
  heading_text!: string;

  @Prop({ type: String })
  start_watching_button_text!: string;

  @Prop({ type: String })
  trial_ends_in_text!: string;
}

@Schema({ _id: false })
export class AssetsV2CommitmentBoostDiscoverySchema {
  @Prop({ type: AssetsV2CommitmentBoostDiscoveryDrawerSchema })
  drawer!: AssetsV2CommitmentBoostDiscoveryDrawerSchema;
}

@Schema({ _id: false })
export class PaymentSuccessPageRecommendedContentSchema {
  @Prop({ required: true, type: Number })
  content_id!: number;

  @Prop({ enum: ContentType, required: true, type: String })
  content_type!: ContentType;
}

@Schema({ _id: false })
export class AssetsV2DiscoveryBoostSchema {
  @Prop({ type: AssetsV2DiscoveryBoostDrawerSchema })
  bottom_sheet!: AssetsV2DiscoveryBoostDrawerSchema;

  @Prop({ type: AssetsV2DiscoveryBoostDrawerSchema })
  drawer!: AssetsV2DiscoveryBoostDrawerSchema;
}
