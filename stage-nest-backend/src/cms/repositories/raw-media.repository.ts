import { EntityManager, EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { MediaStatusEnum, RawMedia } from 'common/entities/raw-media.entity';

@Injectable()
export class RawMediaRepository extends EntityRepository<RawMedia> {
  constructor(readonly em: EntityManager) {
    super(em, RawMedia);
  }

  async createBaseRawMedia({
    contentSlug,
    contentType,
    destination,
    durationInSeconds,
    parentRawMediaId,
    source,
    status,
    title,
    uploadProgress,
  }: Pick<RawMedia, 'contentType' | 'destination' | 'source'> &
    Partial<Omit<RawMedia, 'contentType' | 'destination' | 'source'>> & {
      parentRawMediaId?: string | ObjectId;
    }): Promise<RawMedia> {
    const rawMedia = this.create({
      contentType,
      destination,
      durationInSeconds,
      parentRawMediaId: parentRawMediaId
        ? new ObjectId(parentRawMediaId)
        : undefined,
      source,
      status: status ?? MediaStatusEnum.CREATED,
      statusHistory: [
        {
          status: status ?? MediaStatusEnum.CREATED,
          timestamp: new Date(),
        },
      ],
      title,
      transcodingTask: [],
      uploadProgress: uploadProgress ?? 0,
      ...(contentSlug ? { contentSlug } : {}),
    });
    return this.save(rawMedia);
  }

  async findRawMediaStatus(
    id: string | ObjectId,
  ): Promise<MediaStatusEnum | null> {
    if (ObjectId.isValid(id)) {
      const rawMediaStatus = await this.em.findOne(RawMedia, {
        _id: new ObjectId(id),
      });
      return rawMediaStatus?.status ?? null;
    }
    return null;
  }

  async save(rawMedia: RawMedia) {
    await this.em.persistAndFlush(rawMedia);
    return rawMedia;
  }
}
