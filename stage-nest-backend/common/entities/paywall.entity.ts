import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseModel } from './base.entity';
import { Dialect, Lang } from 'common/enums/app.enum';

export enum PaywallItemTypeEnum {
  BUTTON = 'button',
  MEDIA_IMAGE = 'image',
  MEDIA_VIDEO = 'video',
  TEXT = 'text',
}

export enum PaywallStatusEnum {
  ACTIVE = 'active',
  DRAFT = 'draft',
}

@Schema({ _id: false })
export class BasePaywallItem {
  @Prop({ default: true })
  isEnabled!: boolean;

  @Prop({ required: true })
  order!: number;
}

@Schema({ _id: false })
export class BaseTextPaywallItem extends BasePaywallItem {
  @Prop({ required: true })
  text!: string;

  @Prop({ default: PaywallItemTypeEnum.TEXT, required: true })
  type!: PaywallItemTypeEnum.TEXT;
}

@Schema({ _id: false })
export class BaseMediaPaywallItem extends BasePaywallItem {
  @Prop({ required: true })
  aspectRatio!: string;

  @Prop({ required: true })
  sourceLink!: string;
}

@Schema({ _id: false })
export class BaseButtonPaywallItem extends BasePaywallItem {
  @Prop({ default: '#FFFFFF' })
  backgroundColor!: string;

  @Prop({ required: true })
  color!: string;

  @Prop({ default: 16 })
  fontSize!: number;

  @Prop({ default: 400 })
  fontWeight!: number;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  outlineColor!: string;

  @Prop({ default: '#000000' })
  textColor!: string;

  @Prop({ default: PaywallItemTypeEnum.BUTTON, required: true })
  type!: PaywallItemTypeEnum.BUTTON;
}

@Schema({ _id: false })
export class MediaImagePaywallItem extends BaseMediaPaywallItem {
  @Prop({ default: true })
  backgroundColor!: string;

  @Prop({
    default: PaywallItemTypeEnum.MEDIA_IMAGE,
    required: true,
  })
  type!: PaywallItemTypeEnum.MEDIA_IMAGE;
}

@Schema({ _id: false })
export class MediaVideoPaywallItem extends BaseMediaPaywallItem {
  @Prop({ default: true })
  autoplay!: boolean;

  @Prop({ default: true })
  loop!: boolean;

  @Prop({ default: true })
  muted!: boolean;

  @Prop({ default: true })
  showControls!: boolean;

  @Prop({ default: PaywallItemTypeEnum.MEDIA_VIDEO, required: true })
  type!: PaywallItemTypeEnum.MEDIA_VIDEO;
}

@Schema({ timestamps: true })
export class PaywallItem extends BasePaywallItem {}

@Schema({ timestamps: true })
export class Paywall extends BaseModel {
  @Prop({ default: [], type: [BaseButtonPaywallItem] })
  buttonPaywallItems!: BaseButtonPaywallItem[];

  @Prop({ required: true })
  lang!: Lang;

  @Prop({ default: [], type: [MediaImagePaywallItem] })
  mediaImagePaywallItems!: MediaImagePaywallItem[];

  @Prop({ default: [], type: [MediaVideoPaywallItem] })
  mediaVideoPaywallItems!: MediaVideoPaywallItem[];

  @Prop({ required: true, type: String, unique: true })
  name!: string;

  @Prop({ default: '', required: true, type: String })
  paywallId!: string;

  @Prop({ type: String })
  peripheralImageUrl!: string;

  @Prop({ required: true, type: String })
  planId!: string;

  @Prop({ required: true, type: String })
  renewalImage!: string;

  @Prop({ default: PaywallStatusEnum.DRAFT })
  status!: PaywallStatusEnum;

  @Prop({ required: true })
  targetDialects!: Dialect[];

  @Prop({ default: [], type: [BaseTextPaywallItem] })
  textPaywallItems!: BaseTextPaywallItem[];
}

export const PaywallSchema = SchemaFactory.createForClass(Paywall);

// Create compound unique index on paywallId + lang to allow same paywallId for different languages
PaywallSchema.index({ lang: 1, paywallId: 1 }, { unique: true });

export type PaywallDocument = Paywall & Document;
