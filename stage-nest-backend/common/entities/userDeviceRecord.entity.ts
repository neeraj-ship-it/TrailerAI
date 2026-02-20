import { Prop, Schema } from '@nestjs/mongoose';

import { Types } from 'mongoose';

import { BaseModel } from './base.entity';
import { User } from './user.entity';

@Schema({ collection: 'userdevicerecordv2', timestamps: true })
export class UserDeviceRecord extends BaseModel {
  @Prop({ default: null, type: String })
  buildNumber?: string | null;

  @Prop({ required: true, type: String })
  deviceId!: string;

  @Prop({ default: () => new Date(), type: Date })
  latestLoginTime!: Date;

  @Prop({ type: String })
  os?: string;

  @Prop({ type: String })
  platform?: string;

  @Prop({ ref: User.name, required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;
}
