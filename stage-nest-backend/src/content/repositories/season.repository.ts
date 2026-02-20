import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';
import { Season } from 'src/content/entities/season.entity';

@Injectable()
export class SeasonsRepository extends BaseRepository<Season> {
  constructor(@InjectModel(Season.name) private seasonsModel: Model<Season>) {
    super(seasonsModel);
  }
}
