import { Prop, Schema } from '@nestjs/mongoose';

import { Types } from 'mongoose';

import { User } from './user.entity';
import { BaseModel } from 'common/entities/base.entity';

@Schema()
export class Content {
  @Prop({ type: Number })
  _id!: number;
  @Prop({ type: String })
  contentType!: string;
  @Prop({ type: String })
  dialect!: string;
  @Prop({ type: Number })
  rank!: number;
  @Prop({ type: String })
  slug!: string;
}

@Schema({ autoIndex: true, collection: 'userWatchData', timestamps: true })
export class UserWatchData extends BaseModel {
  @Prop({ type: [Content] })
  contents!: Content[];
  @Prop({ index: true, ref: User.name, type: Types.ObjectId })
  user!: Types.ObjectId;
}
