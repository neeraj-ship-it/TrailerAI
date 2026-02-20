import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

import { Dialect, Platform, OS } from '../enums/app.enum';
import { ContentType, LoginEnum } from '../enums/common.enums';
import { BaseModel } from './base.entity';

export enum StatusEnum {
  'ACTIVE' = 'active',
  'BANNED' = 'banned',
  'INACTIVE' = 'inactive',
}

export enum NotificationStatusEnum {
  'ACTIVE' = 'active',
  'COMPLETED' = 'completed',
}

@Schema({ _id: false })
export class WatchListItems {
  @Prop({ required: true })
  contentSlug!: string;

  @Prop({ required: true })
  contentType!: ContentType;
}

@Schema({ _id: false })
export class KeyValue {
  @Prop({ required: true })
  key!: string;

  @Prop({ min: 0, required: true })
  value!: number;
}

@Schema({ _id: false })
export class LastSeenDetail {
  @Prop({ required: true })
  episodeSlug!: string;

  @Prop({ required: true })
  seasonSlug!: string;

  @Prop({ required: true })
  showId!: number;

  @Prop({ required: true })
  showSlug!: string;
}

@Schema({ _id: false })
export class LocationHistory {
  @Prop({ required: true })
  City!: string;

  @Prop({ required: true })
  ClientIP!: string;

  @Prop({ required: true })
  Country!: string;

  @Prop({ required: true })
  State!: string;

  @Prop({ required: true })
  Timestamp!: Date;
}

@Schema({ _id: false })
export class Notification {
  @Prop({ required: true })
  slug!: string;

  @Prop({ required: true })
  type!: string;
}

// Incomplete schema definition
@Schema({ _id: false })
export class ContinueWatching {
  @Prop({ required: true, type: String })
  entitySlug!: string;

  @Prop({ required: true, type: String })
  episodeSeasonSlug!: string;

  @Prop({ required: true, type: String })
  episodeSlug!: string;

  @Prop({ default: 0, required: true, type: Number })
  lapsedPercentage!: number;

  @Prop({ default: 0, required: true, type: Number })
  lapseTime!: number;

  @Prop({ required: true, type: String })
  showSlug!: string;
}

@Schema({ autoIndex: true, timestamps: true })
export class User extends BaseModel {
  @Prop({ type: String })
  adid?: string;

  @Prop({ type: String })
  advertising_id?: string; //android, for appsflyer events

  @Prop()
  amplitudeDeviceId?: string;

  @Prop()
  amplitudeUserId?: string;

  @Prop({ min: 0 })
  appOpenCount?: number;

  @Prop({
    default: [],
    get: (v: [string]) => {
      v.map((date) => (typeof date === 'string' ? new Date(date) : date));
    },
    type: [Date],
  })
  appOpenDatesArr?: Date[];

  @Prop({ type: String })
  appsflyer_id?: string; // for appsflyer events

  @Prop({ required: true })
  appVersion!: string;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  artistResumedList?: Record<string, number>;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  artistseen?: Record<string, number>;

  @Prop({ type: String })
  bundleIdentifier?: string; // for appsflyer events

  @Prop({ required: true, type: [Number] })
  categoryPreference?: number[];

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  collectionMediaResumedList?: Record<string, number>;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  consumedGenre?: Record<string, number>;

  @Prop({ default: [], type: [ContinueWatching] })
  continueWatchingList!: ContinueWatching[];

  @Prop()
  continueWatchingSlug?: string;

  @Prop({ type: String })
  countryCode?: string;

  @Prop({ required: true })
  currentCity?: string;

  @Prop({ required: true })
  currentClientIP?: string;

  @Prop({ required: true })
  currentCountry?: string;

  @Prop({ required: true })
  currentState?: string;

  @Prop({ min: 0 })
  dayCount?: number;

  @Prop({ required: true })
  deviceId?: string;

  @Prop()
  email?: string;

  @Prop()
  entityType?: string;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  episodeResumedList?: Record<string, number>;

  @Prop({ type: String })
  firebaseAppInstanceId?: string; // for firebase app events

  @Prop({ type: String })
  firebaseClientId?: string; // for firebase web events

  @Prop()
  firebaseToken?: string;

  @Prop()
  firstName?: string;

  @Prop()
  generatedOTPCount?: number;

  @Prop({ default: [], type: [String] })
  genres?: string[];

  @Prop({ type: String })
  idfa?: string; //iOS, for appsflyer events

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  individualEpisodeResumedList?: Record<string, number>;

  @Prop({ type: String })
  initialUserCulture?: string;

  @Prop({ required: true })
  installedDate?: Date;

  @Prop({ index: true, type: String })
  iosUserId?: string;

  @Prop({ default: false })
  isflutterUser?: boolean;

  @Prop({ default: false })
  isLoggedIn?: boolean;

  @Prop({ default: true })
  isNewUser?: boolean;

  @Prop({ default: true })
  isTNPLUser?: boolean;

  @Prop()
  IVRtemplate?: string;

  @Prop({ required: true })
  language?: string;

  @Prop({ min: 0 })
  lapseTime?: number;

  @Prop()
  lastName?: string;

  @Prop({ type: [LastSeenDetail] })
  lastSeenDetail?: LastSeenDetail[];

  @Prop({ type: [LocationHistory] })
  locationHistory?: LocationHistory[];

  @Prop()
  loginDate?: Date;

  @Prop({ default: false })
  loginIvr?: boolean;

  @Prop({ enum: LoginEnum, required: true })
  loginType?: string;

  @Prop()
  nextNotificationDate?: Date;

  @Prop({ type: Notification })
  notification?: Notification;

  @Prop({ enum: NotificationStatusEnum, required: true, type: String })
  notificationStatus?: NotificationStatusEnum;

  @Prop()
  notificationType?: string;

  @Prop({ type: String })
  oaid?: string; // for appsflyer events

  @Prop({ default: false })
  onboarding?: boolean;

  @Prop({ default: false })
  onboardingConsumption?: boolean;

  @Prop({ default: false })
  onboardingShow?: boolean;

  @Prop({ default: false })
  onboardingVideoStatus?: boolean;

  @Prop()
  otp?: number;

  @Prop({ required: true })
  primaryLanguage!: Dialect;

  @Prop({ type: String })
  primaryMobileNumber!: string;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  relatedContent?: Record<string, number>;

  @Prop()
  relatedContentSlug?: string;

  @Prop()
  sentNotificationSlug?: string;

  @Prop({ of: Number, type: MongooseSchema.Types.Map })
  showMediaResumedList?: Record<string, number>;

  @Prop({ type: String })
  signUpBuildNumber?: string;

  @Prop({ enum: OS, type: String })
  signUpOs?: OS;

  @Prop({ enum: Platform, type: String })
  signUpPlatform?: Platform;

  @Prop()
  SMStemplate?: string;

  @Prop({ enum: StatusEnum, required: true })
  status?: string;

  @Prop({ required: true })
  type?: string;

  @Prop({ default: false })
  uninstalledStatus?: boolean;

  @Prop({ enum: Dialect, type: String })
  userCulture?: Dialect;

  @Prop({ required: true })
  userIP?: string;

  @Prop({ required: true })
  userName?: string;

  @Prop({ required: true })
  userType?: string;

  @Prop({ type: [WatchListItems] })
  watchListItems?: WatchListItems[];
}
