import { ContentStatus } from 'common/entities/contents.entity';
import { ProgressTypeEnum } from 'common/entities/raw-media.entity';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

export interface PreviewContentCohortUpdateEvent {
  action: 'added' | 'removed';
  contentId: number;
  contentSlug: string;
  contentType: ContentTypeV2;
  dialect: Dialect;
  timestamp: number;
  userIds: string[];
}

export interface ContentStatusChangeEvent {
  contentId: number;
  contentSlug: string;
  contentType: ContentTypeV2;
  dialect: Dialect;
  newStatus: ContentStatus;
  oldStatus: ContentStatus;
}

export interface VideoQcRequestedEvent {
  progressBaseUrl: string;
  projectId: string;
  s3Bucket: string;
  s3FileKey: string;
  s3Region: string;
  token: string; // x-internal-auth-token
}

export enum ProgressStatusEnum {
  COMPLETE = 'qc-complete',
  FAILED = 'qc-failed',
  INITIATED = 'qc-initiated',
  PROGRESS = 'qc-progress',
}

export interface VideoQcProgressEvent {
  issues?: Issue[];
  progressPercentage: number;
  progressType: ProgressTypeEnum;
  projectId: string;
  status: ProgressStatusEnum;
}

export interface Issue {
  category: string;
  duration: number;
  end: number;
  end_minutes: string;
  start: number;
  start_minutes: string;
}
