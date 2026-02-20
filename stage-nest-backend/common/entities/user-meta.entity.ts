import { Prop, Schema } from '@nestjs/mongoose';

import { Types } from 'mongoose';

import { Dialect, OS } from '../enums/app.enum';
import { BaseModel } from './base.entity';
import { User } from './user.entity';

@Schema({ _id: false })
export class AppsflyerData {
  @Prop({ type: String })
  advertising_id!: string;

  // @Prop({  type: String })
  // amazon_aid: string;

  @Prop({ type: String })
  app_store?: string;

  @Prop({ type: String })
  app_version_name?: string;

  @Prop({ type: String })
  appsflyer_id!: string;

  @Prop({ type: String })
  bundleIdentifier!: string;

  @Prop({ type: String })
  customer_user_id?: string;

  // @Prop({  type: String })
  // eventCurrency: CurrencyEnum;

  @Prop({ type: String })
  imei?: string;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  oaid!: string;

  @Prop({ enum: OS, type: String })
  os?: OS;

  @Prop({ type: String })
  ua?: string;
}

@Schema({ _id: false })
export class FirebaseData {
  @Prop({ type: String })
  firebaseAppInstanceId!: string;
}

@Schema({ timestamps: true })
export class UserMeta extends BaseModel {
  @Prop({ type: AppsflyerData })
  appsflyerData?: AppsflyerData;

  @Prop({ type: FirebaseData })
  firebaseData?: FirebaseData;

  @Prop({ enum: Dialect, type: String })
  initialUserCulture!: Dialect;

  @Prop({ enum: OS, type: String })
  os!: OS;

  @Prop({ ref: User.name, required: true, type: Types.ObjectId })
  user!: Types.ObjectId;
}
