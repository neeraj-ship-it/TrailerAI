import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';

import { TrailerVariant } from '../entities/trailer-variant.entity';

@Injectable()
export class TrailerVariantRepository extends BaseRepository<TrailerVariant> {
  constructor(
    @InjectModel(TrailerVariant.name)
    private readonly trailerVariantModel: Model<TrailerVariant>,
  ) {
    super(trailerVariantModel);
  }
}
