import { Prop, Schema } from '@nestjs/mongoose';

import { TextWithColorSchema } from './specialAccess.schema';

// Enums
export enum ChatbotAssetCtaAction {
  START_CHAT = 'start_chat',
}

export enum ChatbotAssetType {
  GIF = 'gif',
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum ContentAssetContentType {
  MOVIE = 'individual',
  SHOW = 'show',
}

// Schemas
@Schema({ _id: false })
export class CtaSchema {
  @Prop({ enum: ChatbotAssetCtaAction, type: String })
  action!: ChatbotAssetCtaAction;

  @Prop({ type: String })
  bg_color!: string;

  @Prop({ type: String })
  text!: string;

  @Prop({ type: String })
  text_color!: string;
}

@Schema({ _id: false })
export class ChatbotAssetDrawerSchema {
  @Prop({ enum: ChatbotAssetType, type: String })
  asset_type!: ChatbotAssetType;

  @Prop({ type: String })
  asset_url!: string;

  @Prop({ type: CtaSchema })
  cta!: CtaSchema;
}

@Schema({ _id: false })
export class CommitmentBoostDiscoveryDrawerSchema {
  @Prop({ enum: ChatbotAssetType, type: String })
  asset_type!: ChatbotAssetType;

  @Prop({ type: String })
  asset_url!: string;

  @Prop({ type: TextWithColorSchema })
  title?: TextWithColorSchema;
}

@Schema({ _id: false })
export class StartChatIconSchema {
  @Prop({ enum: ChatbotAssetCtaAction, type: String })
  action!: ChatbotAssetCtaAction;

  @Prop({ enum: ChatbotAssetType, type: String })
  asset_type!: ChatbotAssetType;

  @Prop({ type: String })
  asset_url!: string;

  @Prop({ required: true, type: [String] })
  characters_carousel_images!: string[];
}

// Chatbot assets schema
@Schema({ _id: false })
export class ChatbotAssetsSchema {
  @Prop({ type: ChatbotAssetDrawerSchema })
  drawer!: ChatbotAssetDrawerSchema;

  @Prop({ type: StartChatIconSchema })
  start_chat_icon!: StartChatIconSchema;
}

@Schema({ _id: false })
export class CommitmentBoostDiscoverySchema {
  @Prop({ type: CommitmentBoostDiscoveryDrawerSchema })
  drawer!: CommitmentBoostDiscoveryDrawerSchema;
}

@Schema({ _id: false })
export class DiscoveryBoostSchema {
  @Prop({ type: CommitmentBoostDiscoveryDrawerSchema })
  drawer!: CommitmentBoostDiscoveryDrawerSchema;
}
