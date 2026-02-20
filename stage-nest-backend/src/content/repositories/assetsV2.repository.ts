import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AssetsV2,
  FeatureEnum,
} from '../../../common/entities/assetsV2.entity';
import {
  BaseRepository,
  type Fields,
} from '@app/common/repositories/base.repository';

export type AssetsV2Fields = Fields<AssetsV2>;
@Injectable()
export class AssetsV2Repository extends BaseRepository<AssetsV2> {
  constructor(
    @InjectModel(AssetsV2.name)
    private readonly assetsV2Model: Model<AssetsV2>,
  ) {
    super(assetsV2Model);
  }

  async findByFeature(feature: FeatureEnum, projection: AssetsV2Fields) {
    return await this.findOne({ feature }, projection, {
      cache: { enabled: true },
      lean: true,
    });
  }
}
