import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core';

import { Dialect } from '@app/common/enums/app.enum';

import { Enum } from '@mikro-orm/mongodb';
import { Types } from 'mongoose';

import { Embedded, Embeddable } from '@mikro-orm/core';

import { ContentProfileRepository } from '../repositories/contentProfile.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { ContentType } from '@app/common/enums/common.enums';

export enum LikeStatusEnum {
  DISLIKE = 'dislike',
  LIKE = 'like',
  SUPERLIKE = 'superlike',
}

@Embeddable()
export class LikeStatus {
  @Enum(() => ContentType)
  contentType!: ContentType;

  @Enum(() => Dialect)
  dialect!: Dialect;

  @Property()
  slug!: string;

  @Enum(() => LikeStatusEnum)
  status!: LikeStatusEnum;
}

@Embeddable()
export class WatchListStatus {
  @Enum(() => ContentType)
  contentType!: ContentType;

  @Property()
  slug!: string;
}

@Entity({ repository: () => ContentProfileRepository })
export class ContentProfile extends MongoBaseEntity {
  [EntityRepositoryType]?: ContentProfileRepository;

  @Embedded(() => LikeStatus, { array: true, object: true })
  likedContent!: LikeStatus[];

  @Property({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Embedded(() => WatchListStatus, { array: true, object: true })
  watchListContent!: WatchListStatus[];
}
