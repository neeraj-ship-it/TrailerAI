import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ContentAssets } from '../../../common/entities/contentAssets.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class ContentAssetsRepository extends BaseRepository<ContentAssets> {
  constructor(
    @InjectModel(ContentAssets.name)
    private readonly contentAssetsModel: Model<ContentAssets>,
  ) {
    super(contentAssetsModel);
  }
}
