import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

export enum SubscriptionStatus {
  ACTIVE_SUBSCRIBER = 1,
  // NON_SUBSCRIBER = 0,    // Non subscriber is may or maynot have document in the collection
  EXPIRED_SUBSCRIBER = 2,
}

@Schema({ autoIndex: true, collection: 'userSubscription', timestamps: true })
export class UserSubscriptionV1 extends BaseModel {
  @Prop({ type: [String] })
  deviceIdArr!: string[];

  @Prop({ type: Boolean })
  isGlobal?: boolean;

  @Prop({ type: Boolean })
  isTrial?: boolean;

  @Prop({ type: String })
  mandateStatus?: string;

  @Prop({
    get: (v: string) => {
      return typeof v === 'string' ? new Date(v) : v;
    },
    type: Date,
  })
  subscriptionExpiry!: Date;

  @Prop({ type: Number })
  subscriptionStatus!: number;

  @Prop({ index: true, type: String })
  userId!: string;
}
