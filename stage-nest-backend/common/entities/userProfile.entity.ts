import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { Enum } from '@mikro-orm/mongodb';

import { BaseModel } from './base.entity';
import { User } from './user.entity';
import {
  GenderEnum,
  Lang,
  ProfileStatus,
  Dialect,
} from 'common/enums/app.enum';

import { Embedded, Embeddable, Property } from '@mikro-orm/core';

import { ContentType } from '@app/common/enums/common.enums';
@Schema({ _id: false })
export class GeoLocation {
  @Prop({ required: true, type: [Number] })
  coordinates!: [number, number];

  @Prop({ enum: ['Point'], required: true })
  type!: 'Point';
}

@Embeddable()
export class WatchListStatus {
  @Enum(() => ContentType)
  contentType!: ContentType;

  @Property()
  slug!: string;
}

@Schema({ timestamps: true })
export class UserProfile extends BaseModel {
  @Prop()
  age?: number;

  @Prop({ required: true })
  avatar!: string;

  @Prop({ enum: Dialect, required: true })
  contentCulture!: Dialect;

  @Prop()
  deletedAt?: Date;

  @Prop({ required: true })
  displayName!: string;

  @Prop()
  fullName?: string;

  @Prop({ enum: GenderEnum })
  gender?: GenderEnum;

  @Prop({ type: GeoLocation })
  geoLocation?: GeoLocation;

  @Prop({ default: false })
  isPrimaryProfile!: boolean;

  @Prop({ enum: Lang, required: true })
  language!: Lang;

  @Prop({ enum: ProfileStatus, required: true })
  status!: ProfileStatus;

  @Prop({ ref: User.name, type: Types.ObjectId })
  user!: Types.ObjectId;

  @Prop({ default: [], type: [WatchListStatus] })
  @Embedded(() => WatchListStatus, { array: true, object: true })
  watchListContent!: WatchListStatus[];

  @Prop()
  yearOfBirth?: number;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
