import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from './base.entity';
import { User } from './user.entity';
import { UserProfile } from './userProfile.entity';
import { Dialect, Lang, ProfileStatus } from 'common/enums/app.enum';

@Schema({
  collection: 'useraccountinvites',
  timestamps: true,
  versionKey: false,
})
export class UserAccountInvite extends BaseModel {
  @Prop({ enum: Dialect, required: true, type: String })
  dialect!: Dialect;

  @Prop({ type: String })
  inviteCountryCode?: string;

  @Prop({ type: String })
  invitePhoneNumber?: string;

  @Prop({ enum: Lang, required: true, type: String })
  language!: Lang;

  @Prop({ type: String })
  profileDeviceId?: string;

  @Prop({ ref: UserProfile.name, type: Types.ObjectId })
  profileId?: Types.ObjectId;

  @Prop({ enum: ProfileStatus, required: true, type: String })
  status!: ProfileStatus;

  @Prop({ required: true, type: String })
  userDeviceId!: string;

  @Prop({ ref: User.name, required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;
}
