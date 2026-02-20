import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  EventArgs,
  EventSubscriber,
  JsonType,
  ObjectId,
  Property,
} from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { RawMediaRepository } from '../../src/cms/repositories/raw-media.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
export enum MediaTypeEnum {
  ARTIST = 'artist',
  COLLECTION_PERIPHERAL = 'collection-peripheral',
  EPISODE = 'episode',
  EPISODE_PERIPHERAL = 'episode-peripheral',
  REEL = 'reel',
  SHOW_EPISODE = 'show-episode',
  SHOW_PERIPHERAL = 'show-peripheral',
}

export enum SourceTypeEnum {
  AI_GENERATED = 'ai-generated',
  GOOGLE_DRIVE = 'google-drive',
  LOCAL_UPLOAD = 'local-upload',
  VIDEO_FRAME = 'video-frame',
}

export enum ProgressTypeEnum {
  AUDIO = 'audio-processing',
  COMPRESS = 'compress',
  DOWNLOAD = 'download',
  PROCESSING_COMPLETE = 'processing-complete',
  VIDEO = 'video-processing',
}

export enum MediaStatusEnum {
  CREATED = 'created',
  GENERATING_FRAMES = 'generating-frames',
  GENERATING_FRAMES_COMPLETED = 'generating-frames-completed',
  GENERATING_FRAMES_FAILED = 'generating-frames-failed',
  GENERATING_POSTER = 'generating-poster',
  GENERATING_POSTER_COMPLETED = 'generating-poster-completed',
  QC_PROCESSING_COMPLETE = 'qc-processing-complete',
  QC_PROCESSING_FAILED = 'qc-processing-failed',
  QC_PROCESSING_INITIATED = 'qc-processing-initiated',
  QC_PROCESSING_PROGRESS = 'qc-processing-progress',

  QUEUED = 'queued',
  TRANSCODING_COMPLETED = 'transcoding-completed',
  TRANSCODING_FAILED = 'transcoding-failed',
  TRANSCODING_STARTED = 'transcoding-started',
  UPLOAD_COMPLETED = 'upload-completed',
  UPLOAD_FAILED = 'upload-failed',
  UPLOADING = 'uploading',
}

export enum TranscodingEngineEnum {
  AWS_MEDIA_CONVERT = 'aws-media-convert',
  VISIONULAR = 'visionular',
}

export enum TranscodingTaskTypeEnum {
  VIDEO_TRANSCODING = 'video-transcoding',
}

export enum TaskStatusEnum {
  COMPLETED = 'completed',
  FAILED = 'failed',
  IN_PROGRESS = 'in-progress',
}

export enum TrailerStatusEnum {
  ANALYZING_AUDIO = 'analyzing_audio',
  ANALYZING_VISUAL = 'analyzing_visual',
  ASSEMBLING_TRAILERS = 'assembling_trailers',
  COMPLETE = 'complete',
  COMPLETED = 'completed',
  DETECTING_SCENES = 'detecting_scenes',
  DOWNLOADING = 'downloading',
  FAILED = 'failed',
  GENERATING_NARRATIVES = 'generating_narratives',
  IDLE = 'idle',
  // Additional Python status values (used as status field)
  INITIATED = 'initiated',
  // Python ProcessingStatus enum values
  PARSING_INPUTS = 'parsing_inputs',
  PROCESSING = 'processing',
  PROCESSING_COMPLETE = 'processing-complete',
  PROCESSING_FAILED = 'processing-failed',
  // Python service status values
  PROCESSING_INITIATED = 'processing-initiated',
  PROCESSING_PROGRESS = 'processing-progress',
  PROGRESS = 'progress',
  UNDERSTANDING_CONTENT = 'understanding_content',
  UPLOADING = 'uploading',
}

export enum TrailerStatusTypeEnum {
  // Legacy values
  ANALYZING = 'analyzing',
  ASSEMBLING = 'assembling',
  AUDIO_ANALYSIS = 'audio-analysis',
  COMPLETE = 'complete',
  CONTENT_UNDERSTANDING = 'content-understanding',
  CREATED = 'created',
  // Python service progress types
  DOWNLOAD = 'download',
  DOWNLOADING = 'downloading',
  FAILED = 'failed',
  GENERATING_NARRATIVES = 'generating-narratives',
  INITIATED = 'initiated',
  LOAD_INPUTS = 'load-inputs',
  NARRATIVE_GENERATION = 'narrative-generation',
  OUTPUT_GENERATION = 'output-generation',
  SCENE_DETECTION = 'scene-detection',
  TRAILER_ASSEMBLY = 'trailer-assembly',
  UPLOAD = 'upload',
  UPLOADING = 'uploading',
  VISUAL_ANALYSIS = 'visual-analysis',
}

@Embeddable()
class Source {
  @Enum(() => SourceTypeEnum)
  type!: SourceTypeEnum;

  @Property()
  url?: string;
}

@Embeddable()
class Destination {
  @Property()
  url!: string;
}
@Embeddable()
export class MediaStatusHistory {
  @Enum(() => MediaStatusEnum)
  status!: MediaStatusEnum;

  @Property()
  timestamp!: Date;
}

@Embeddable()
export class AiTrailerStatus {
  @Property({ default: 0 })
  progress!: number;

  @Enum(() => TrailerStatusEnum)
  status!: TrailerStatusEnum;

  @Enum(() => TrailerStatusTypeEnum)
  statusType!: TrailerStatusTypeEnum;
}

@Embeddable()
export class TranscodingTask {
  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ nullable: true, type: JsonType })
  config?: Record<string, unknown>;

  @Property({ nullable: true })
  createdAt?: Date = new Date();

  @Property({ nullable: true })
  externalTaskId?: string;

  @Property({ nullable: true, type: JsonType })
  result?: Record<'payload', unknown>;

  @Enum(() => TaskStatusEnum)
  taskStatus!: TaskStatusEnum;

  @Enum(() => TranscodingTaskTypeEnum)
  taskType!: TranscodingTaskTypeEnum;

  @Enum(() => TranscodingEngineEnum)
  transcodingEngine!: TranscodingEngineEnum;

  @Property({ nullable: true })
  transcodingTaskId?: ObjectId;
}

@Entity({
  repository: () => RawMediaRepository,
})
export class RawMedia extends MongoBaseEntity {
  @Embedded(() => AiTrailerStatus, { nullable: true, object: true })
  aiTrailer?: AiTrailerStatus;

  @Property({ nullable: true })
  contentSlug?: string;

  @Property()
  contentType!: string;

  @Embedded(() => Destination)
  destination!: Destination;

  @Property()
  durationInSeconds?: number;

  @Property({ nullable: true })
  parentRawMediaId?: ObjectId;

  @Property({ nullable: true })
  qcProgress?: number;

  @Property({ nullable: true, type: 'string' })
  qcProgressType?: ProgressTypeEnum;

  @Property({ nullable: true, type: 'string' })
  qcStatus?: MediaStatusEnum;

  @Embedded(() => Source)
  source!: Source;

  @Enum(() => MediaStatusEnum)
  status!: MediaStatusEnum;

  @Property({ type: JsonType })
  statusHistory: MediaStatusHistory[] = [];

  @Property({ nullable: true })
  title?: string;

  @Embedded(() => TranscodingTask, {
    array: true,
    nullable: true,
    object: true,
  })
  transcodingTask: TranscodingTask[] = [];

  @Property()
  uploadProgress = 0;
}

@Injectable()
export class RawMediaEntityChangeSubscriber
  implements EventSubscriber<RawMedia>
{
  async beforeUpdate(args: EventArgs<RawMedia>): Promise<void> {
    const { changeSet, entity } = args;

    if (!changeSet || !changeSet.payload.status) {
      return;
    }

    console.log(
      '✅ RawMediaEntityChangeSubscriber beforeUpdate triggered!',
      changeSet.payload,
    );

    const newStatus = changeSet?.payload?.status ?? changeSet.entity.status;

    // For Collections, add via the collection method
    entity.statusHistory.unshift({
      status: newStatus,
      timestamp: new Date(),
    });
  }

  getSubscribedEntities(): string[] {
    return [RawMedia.name];
  }
}
