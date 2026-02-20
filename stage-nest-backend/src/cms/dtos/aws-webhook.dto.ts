import { TranscriptionJobStatus } from '@aws-sdk/client-transcribe';

export enum AWS_EVENT_BRIDGE_SOURCE_ENUM {
  AWS_MEDIACONVERT = 'aws.mediaconvert',
  AWS_TRANSCRIBE = 'aws.transcribe',
}

export enum MEDIACONVERT_JOB_STATUS {
  CANCELED = 'CANCELED',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  PROGRESSING = 'PROGRESSING',
  SUBMITTED = 'SUBMITTED',
}

export interface TranscribeJobDetailDto {
  TranscriptionJobName: string;
  TranscriptionJobStatus: TranscriptionJobStatus;
}

export interface AwsTranscribeJobStateChangePayloadDto {
  account: string;
  detail: TranscribeJobDetailDto;
  'detail-type': 'Transcribe Job State Change';
  id: string;
  region: string;
  resources: string[]; // Typically an array of ARNs, can be empty
  source: AWS_EVENT_BRIDGE_SOURCE_ENUM.AWS_TRANSCRIBE;
  time: string; // ISO 8601 date string, e.g., "2025-06-04T05:13:06Z"
  version: string;
}

export interface MediaConvertWarningDto {
  code?: number;
  count?: number;
}

// export interface MediaConvertVideoDetailsDto {
//   averageBitrate?: number;
//   heightInPx: number;
//   widthInPx: number;
// }

export interface MediaConvertOutputDetailDto {
  durationInMs: number;
  outputFilePaths: string[];
  // videoDetails?: MediaConvertVideoDetailsDto;
}

export interface MediaConvertOutputGroupDetailDto {
  outputDetails: MediaConvertOutputDetailDto[];
  type?: string; // Typically "FILE_GROUP"
}

// Base interface with common fields
interface MediaConvertJobDetailBaseDto {
  accountId: string;
  blackVideoDetected?: number;
  jobId: string;
  paddingInserted?: number;
  queue: string; // ARN of the queue
  timestamp: number;
  warnings?: MediaConvertWarningDto[];
}

// When job is complete, outputGroupDetails is required
interface MediaConvertJobDetailCompleteDto
  extends MediaConvertJobDetailBaseDto {
  outputGroupDetails: MediaConvertOutputGroupDetailDto[];
  status: MEDIACONVERT_JOB_STATUS.COMPLETE;
}

// For other statuses, outputGroupDetails is optional
interface MediaConvertJobDetailOtherDto extends MediaConvertJobDetailBaseDto {
  outputGroupDetails?: MediaConvertOutputGroupDetailDto[];
  status: Exclude<MEDIACONVERT_JOB_STATUS, MEDIACONVERT_JOB_STATUS.COMPLETE>;
}

// Union type for all possible job detail states
export type MediaConvertJobDetailDto =
  | MediaConvertJobDetailCompleteDto
  | MediaConvertJobDetailOtherDto;

export interface AwsMediaConvertJobStateChangePayloadDto {
  detail: MediaConvertJobDetailDto;
  source: AWS_EVENT_BRIDGE_SOURCE_ENUM.AWS_MEDIACONVERT;
}
