import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Artist } from '../entities/artist-v1.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class ArtistRepository extends BaseRepository<Artist> {
  constructor(@InjectModel(Artist.name) private artistModel: Model<Artist>) {
    super(artistModel);
  }
}
