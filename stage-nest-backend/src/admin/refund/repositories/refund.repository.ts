import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Refund } from '../entities/refund.entity';
import { RefundedByEnum } from '../enums/refundedBy.enum';
import { BaseRepository } from '@app/common/repositories/base.repository';

export class RefundRepository extends BaseRepository<Refund> {
  constructor(
    @InjectModel(Refund.name)
    private readonly refundModel: Model<Refund>,
  ) {
    super(refundModel);
  }
  async getTodaysAgentRefundsCount(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [result] = await this.refundModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
          refundedBy: RefundedByEnum.AGENT,
        },
      },
      {
        $count: 'count',
      },
      {
        $facet: {
          actualCount: [{ $project: { count: 1 } }],
          countData: [{ $addFields: { count: 0 } }],
        },
      },
      {
        $project: {
          count: {
            $ifNull: [{ $arrayElemAt: ['$actualCount.count', 0] }, 0],
          },
        },
      },
    ]);

    return result.count;
  }
}
