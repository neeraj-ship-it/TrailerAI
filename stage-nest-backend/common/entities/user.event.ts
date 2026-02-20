import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';

@Schema({ _id: false })
export class UserEventData {
  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ required: true })
  dialect!: string;

  @Prop({ required: true })
  eventName!: string;

  @Prop({ required: false, type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ required: true })
  os!: string;

  @Prop({ default: false, type: Boolean })
  sentToAppsflyer!: boolean;
}

@Schema({ autoIndex: true, timestamps: true })
export class UserEvent extends BaseModel {
  @Prop({ default: [], type: [UserEventData] })
  events!: UserEventData[];
}
