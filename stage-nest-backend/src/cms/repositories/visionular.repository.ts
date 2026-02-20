import { Injectable } from '@nestjs/common';

import { EntityRepository } from '@mikro-orm/mongodb';

import { EntityManager } from '@mikro-orm/mongodb';

import { VisionularTranscodingTask } from '../entities/visionular-transcoding.entity';

@Injectable()
export class VisionularTaskRepository extends EntityRepository<VisionularTranscodingTask> {
  constructor(readonly em: EntityManager) {
    super(em, VisionularTranscodingTask);
  }

  async save(visionularTranscodingTask: VisionularTranscodingTask) {
    return this.em.persistAndFlush(visionularTranscodingTask);
  }
}
