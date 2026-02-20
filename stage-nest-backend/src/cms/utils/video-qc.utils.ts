import { Issue, ProgressStatusEnum } from '../dtos/kafka-events.dto';
import { VideoQcStatusEnum } from '../entities/video-qc.entity';
import {
  MediaStatusEnum,
  ProgressTypeEnum,
} from 'common/entities/raw-media.entity';

export const mapExternalStatusToVideoQcStatus = (
  externalStatus: ProgressStatusEnum,
  progressType: ProgressTypeEnum,
  issues: Issue[],
): VideoQcStatusEnum => {
  // Map external status to VideoQcStatusEnum
  switch (externalStatus) {
    case ProgressStatusEnum.INITIATED:
      return VideoQcStatusEnum.PENDING;
    case ProgressStatusEnum.PROGRESS:
      return VideoQcStatusEnum.PROCESSING;
    case ProgressStatusEnum.COMPLETE:
      if (issues && issues.length > 0) {
        return VideoQcStatusEnum.REJECTED;
      }
      return VideoQcStatusEnum.APPROVED;
    case ProgressStatusEnum.FAILED:
      return VideoQcStatusEnum.FAILED;
    default:
      return VideoQcStatusEnum.PENDING;
  }
};

export const mapExternalStatusToMediaStatus = (
  externalStatus: ProgressStatusEnum,
): MediaStatusEnum => {
  // Map to base QC statuses
  switch (externalStatus) {
    case ProgressStatusEnum.INITIATED:
      return MediaStatusEnum.QC_PROCESSING_INITIATED;
    case ProgressStatusEnum.PROGRESS:
      return MediaStatusEnum.QC_PROCESSING_PROGRESS;
    case ProgressStatusEnum.COMPLETE:
      return MediaStatusEnum.QC_PROCESSING_COMPLETE;
    case ProgressStatusEnum.FAILED:
      return MediaStatusEnum.QC_PROCESSING_FAILED;
    default:
      return MediaStatusEnum.QC_PROCESSING_INITIATED;
  }
};
