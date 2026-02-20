import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Coupon } from '../entities/coupon.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class CouponRepository extends BaseRepository<Coupon> {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<Coupon>,
  ) {
    super(couponModel);
  }
}
