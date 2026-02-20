import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { VideoQc } from '../entities/video-qc.entity';

@Injectable()
export class VideoQcRepository extends EntityRepository<VideoQc> {
  constructor(readonly em: EntityManager) {
    super(em, VideoQc);
  }

  async save(videoQc: VideoQc) {
    await this.em.persistAndFlush(videoQc);
    return videoQc;
  }
}
