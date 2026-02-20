import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { ArtistV2 } from 'common/entities/artist-v2.entity';

@Injectable()
export class ArtistRepositoryV2 extends EntityRepository<ArtistV2> {
  constructor(readonly em: EntityManager) {
    super(em, ArtistV2);
  }
  async save(artist: ArtistV2) {
    return this.em.persistAndFlush(artist);
  }
}
