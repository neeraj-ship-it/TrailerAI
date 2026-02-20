import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { LegacyGenre } from '../entities/legacy-genre.entity';
import { BaseRepository } from 'common/repositories/base.repository';

@Injectable()
export class LegacyGenreRepository extends BaseRepository<LegacyGenre> {
  constructor(
    @InjectModel(LegacyGenre.name)
    private readonly legacyGenreModel: Model<LegacyGenre>,
  ) {
    super(legacyGenreModel);
  }

  async nativeUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<void> {
    await this.legacyGenreModel.updateMany(filter, { $set: update });
  }
}
