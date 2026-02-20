import { Injectable } from '@nestjs/common';

import { EntityManager, EntityRepository } from '@mikro-orm/core';

import { DescriptorTag } from '../entities/descriptor-tag.entity';

@Injectable()
export class DescriptorTagRepository extends EntityRepository<DescriptorTag> {
  constructor(readonly em: EntityManager) {
    super(em, DescriptorTag);
  }
  async save(descriptorTag: DescriptorTag) {
    return this.em.persistAndFlush(descriptorTag);
  }
}
