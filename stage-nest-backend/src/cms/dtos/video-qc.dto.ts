import { VideoQcStatusEnum } from '../entities/video-qc.entity';
import { Issue } from './kafka-events.dto';
import { ProgressTypeEnum } from 'common/entities/raw-media.entity';

export interface VideoQcEventRequestDto {
  projectId: string;
}

export interface VideoQcEventResponseDto {
  projectId: string;
  topic: string;
}

export interface VideoQcKafkaEventDto {
  projectId: string;
  rawMediaId: string;
  requestedBy: string;
  videoUrl: string;
}

export interface VideoQcProgressResponse {
  issues: Issue[];
  projectId: string;
  qcProgress: number;
  qcProgressType: ProgressTypeEnum;
  qcStatus: VideoQcStatusEnum;
}
