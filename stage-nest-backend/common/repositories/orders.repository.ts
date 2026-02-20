import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Orders } from '../entities/orders.entity';
import { BaseRepository } from './base.repository';

export class OrdersRepository extends BaseRepository<Orders> {
  constructor(
    @InjectModel(Orders.name)
    private readonly ordersModel: Model<Orders>,
  ) {
    super(ordersModel);
  }
}
