import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  ObjectId,
  Property,
} from '@mikro-orm/mongodb';

import { VideoQcRepository } from '../repositories/video-qc.repository';

import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';

export enum VideoQcStatusEnum {
  APPROVED = 'qc-approved',
  CREATED = 'qc-created',
  FAILED = 'qc-failed',
  PENDING = 'qc-pending',
  PROCESSING = 'qc-processing',
  REJECTED = 'qc-rejected',
}

// export enum IssueCategoryEnum {
//   AUDIO = 'audio',
//   VIDEO = 'video',
//   SUBTITLES = 'subtitles',
//   OTHER = 'other',
// }

@Embeddable()
export class VideoQcHistoryItem {
  @Property({ default: new Date().toISOString() })
  createdAt!: string;

  @Embedded(() => Issue, { array: true, object: true })
  issues: Issue[] = [];

  @Property()
  rawMediaId!: string;

  @Enum(() => VideoQcStatusEnum)
  status!: VideoQcStatusEnum;
}

@Embeddable()
class Issue {
  @Property()
  category!: string;

  @Property()
  duration!: number;

  @Property()
  end!: number;

  @Property()
  end_minutes!: string;

  @Property()
  start!: number;

  @Property()
  start_minutes!: string;
}

@Entity({
  repository: () => VideoQcRepository,
})
export class VideoQc extends MongoBaseEntity {
  @Property({ type: ObjectId })
  createdBy!: ObjectId;

  @Embedded(() => VideoQcHistoryItem, {
    array: true,
    object: true,
  })
  history: VideoQcHistoryItem[] = [];

  @Embedded(() => Issue, { array: true, object: true })
  issues: Issue[] = [];

  @Property({ default: 0 })
  noOfAttempts!: number;

  @Property({ unique: true })
  projectId!: string;

  @Property({ nullable: true })
  qcRequestId?: string;

  @Property({ nullable: true })
  rawMediaId?: string;

  @Enum(() => VideoQcStatusEnum)
  status!: VideoQcStatusEnum;

  @Property({ nullable: true })
  videoUrl?: string;
}
