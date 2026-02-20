import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MetaDecryptedData } from '../entities/metaDecryptedData.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class DecryptDataRepository extends BaseRepository<MetaDecryptedData> {
  constructor(
    @InjectModel(MetaDecryptedData.name)
    private decryptDataModel: Model<MetaDecryptedData>,
  ) {
    super(decryptDataModel);
  }

  async createDecryptRecord(
    data: Partial<MetaDecryptedData>,
  ): Promise<MetaDecryptedData> {
    return this.create(data);
  }
}
