import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';
import { Dialects } from 'common/entities/dialects.enitity';

@Injectable()
export class DialectsRepository extends BaseRepository<Dialects> {
  constructor(
    @InjectModel(Dialects.name)
    private dialectsModel: Model<Dialects>,
  ) {
    super(dialectsModel);
  }
}
