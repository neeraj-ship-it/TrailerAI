// import { QUEUES } from 'common/constants/queues.const';
import { ContentFormat } from 'common/entities/contents.entity';
import { Dialect } from 'common/enums/app.enum';
import { ContentType, ContentTypeV2 } from 'common/enums/common.enums';

export enum CMSQueueKeys {
  CMS_CONTENT_PERIPHERAL_ASSET_MONITORING = 'CMS_CONTENT_PERIPHERAL_ASSET_MONITORING',
  CONTENT_PUBLISHING = 'CONTENT_PUBLISHING',
  DRIVE_UPLOAD = 'DRIVE_UPLOAD',
  EPISODE_SCHEDULING = 'EPISODE_SCHEDULING',
}

export interface EpisodeProcessingData {
  contentType: ContentTypeV2;
  dialect: Dialect;
  format: ContentFormat;
  scheduledDate: Date;
  slug: string;
}

export interface EpisodeProcessingPayload {
  key: CMSQueueKeys.EPISODE_SCHEDULING;
  payload: EpisodeProcessingData;
}

// Payload for asset monitoring queue
interface ContentPeripheralAssetMonitoringPayload {
  key: CMSQueueKeys.CMS_CONTENT_PERIPHERAL_ASSET_MONITORING;
}

// Payload for drive upload queue
export interface DriveUploadData {
  bucket: string;
  contentType: ContentType.EPISODE | ContentType.MOVIE | ContentType.REEL;
  durationInSeconds: number;
  fileId: string;
  filePath: string;
  fullFilePath: string;
  mimeType: string;
  rawMediaId: string;
  size: number;
  webViewLink: string;
}

export interface DriveUploadPayload {
  key: CMSQueueKeys.DRIVE_UPLOAD;
  payload: DriveUploadData;
}

export type CMSQueuePayload =
  | EpisodeProcessingPayload
  | ContentPeripheralAssetMonitoringPayload
  | DriveUploadPayload;
