import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IUpdateDispute } from '../dtos/dispute.interface';
import { Dispute } from '../entities/dispute.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { filterObjKeys } from '@app/common/utils/helpers';

@Injectable()
export class DisputeRepository extends BaseRepository<Dispute> {
  constructor(@InjectModel(Dispute.name) private disputeModel: Model<Dispute>) {
    super(disputeModel);
  }

  /**
   *
   * @param {stirng} disputeId - dispute id
   * @param {IUpdateDispute} updateDispute - dispute update object
   * @returns updated dispute object
   */
  public async updateDispute(disputeId: string, updateDispute: IUpdateDispute) {
    const updateObj = filterObjKeys(updateDispute);

    const updatedDispute = await this.disputeModel.updateOne(
      { disputeId },
      {
        $set: updateObj,
      },
      { new: true },
    );

    return updatedDispute;
  }
}
