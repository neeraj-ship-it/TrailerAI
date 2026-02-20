import { Prop, Schema } from '@nestjs/mongoose';

import { OS } from '../enums/app.enum';
import { BaseModel } from './base.entity';

@Schema({ collection: 'watch-video-events', timestamps: false })
export class WatchVideoEvent extends BaseModel {
  @Prop({ required: true, type: String })
  app_version!: string;

  @Prop({ required: true, type: Number })
  consumed_duration!: number;

  @Prop({ required: true, type: String })
  content_id!: string;

  @Prop({ required: true, type: String })
  content_slug!: string;

  @Prop({ required: true, type: String })
  content_type!: string;

  @Prop({ required: true, type: String })
  device_id!: string;

  @Prop({ required: true, type: String })
  event_type!: string;

  @Prop({ required: true, type: String })
  os!: OS;

  @Prop({ required: true, type: String })
  platform!: string;

  @Prop({ type: String })
  profile_id?: string;

  @Prop({ required: true, type: String })
  timestamp!: string;

  @Prop({ required: true, type: Number })
  total_duration!: number;

  @Prop({ required: true, type: String })
  user_id!: string;
}
