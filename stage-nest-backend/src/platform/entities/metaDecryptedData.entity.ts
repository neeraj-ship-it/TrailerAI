import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from '@app/common/entities/base.entity';

@Schema({ autoIndex: true, timestamps: true })
export class MetaDecryptedData extends BaseModel {
  /** Account ID */
  @Prop({ index: true, type: String })
  accountId?: string;

  /** Ad group ID */
  @Prop({ index: true, type: String })
  adGroupId?: string;

  /** Ad group name */
  @Prop({ index: true, type: String })
  adgroupName?: string;

  /** Ad ID */
  @Prop({ index: true, type: String })
  adId?: string;

  /** Ad objective name */
  @Prop({ index: true, type: String })
  adObjectiveName?: string;

  /** Campaign group ID */
  @Prop({ index: true, type: String })
  campaignGroupId?: string;

  /** Campaign group name */
  @Prop({ type: String })
  campaignGroupName?: string;

  /** Campaign ID */
  @Prop({ index: true, type: String })
  campaignId?: string;

  /** Campaign name */
  @Prop({ type: String })
  campaignName?: string;

  /** Original encrypted cipher from client */
  @Prop({ required: true, type: String })
  cipher!: string;

  /** Extracted deeplink URL */
  @Prop({ index: true, type: String })
  deeplink?: string;

  /** Device ID from request headers */
  @Prop({ index: true, required: true, type: String })
  deviceId!: string;

  /** Original nonce from client */
  @Prop({ required: true, type: String })
  nonce!: string;

  /** Raw JSON string of decrypted data */
  @Prop({ type: String })
  rawJson?: string;

  /** Processing status */
  @Prop({
    default: 'pending',
    enum: ['pending', 'processed', 'failed'],
    type: String,
  })
  status!: 'pending' | 'processed' | 'failed';
}
