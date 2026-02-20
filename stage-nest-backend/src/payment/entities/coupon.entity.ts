import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

export enum CouponStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CouponTypeEnum {
  PERCENT = 'percent',
}

export enum CouponCountryEnum {
  ALL = 'ALL',
  IN = 'IN',
}

@Schema()
export class Coupon extends BaseModel {
  @Prop({
    required: true,
    type: String,
    unique: true,
  })
  name!: string;

  @Prop({
    required: true,
    type: Number,
  })
  percentage!: number;

  @Prop({
    default: [],
    type: [String],
  })
  planId!: string[];

  @Prop({
    required: true,
    type: Boolean,
  })
  showInApp!: boolean;

  @Prop({
    enum: CouponStatusEnum,
    required: true,
    type: String,
  })
  status!: CouponStatusEnum;

  @Prop({
    required: true,
    type: String,
  })
  titleEn!: string;

  @Prop({
    required: true,
    type: String,
  })
  titleHin!: string;

  @Prop({
    enum: CouponTypeEnum,
    required: true,
    type: String,
  })
  type!: CouponTypeEnum;

  @Prop({
    enum: CouponCountryEnum,
    required: true,
    type: String,
  })
  validCountry!: CouponCountryEnum;

  @Prop({
    required: true,
    type: String,
  })
  vendorType!: string;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
