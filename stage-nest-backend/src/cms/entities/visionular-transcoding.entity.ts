import {
  Entity,
  Enum,
  ManyToOne,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity';
import { RawMedia } from 'common/entities/raw-media.entity';
import { VisionularContentType } from 'common/interfaces/visionular.interface';

export enum TranscodingTaskStatusEnum {
  CREATED = 'created',
  FAILED = 'failed',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
}

export interface TranscodingCallbackData {
  custom_info: string;
  duration: number;
  format: string;
  input: string;
  output: string;
  output_audio_codec: string;
  output_audio_samplerate: string;
  output_bitrate: number;
  output_framerate: number;
  output_groups: null;
  output_media_size: number;
  output_resolution: string;
  output_size: number;
  output_video_codec: string;
  source_audio_codec: string;
  source_bitrate: number;
  source_framerate: number;
  source_resolution: string;
  source_video_codec: string;
  spend_time: number;
  status: string;
  task_id: string;
}

@Entity({ collection: 'VisionularTranscoding' })
export class VisionularTranscodingTask extends MongoBaseEntity {
  @Property({ nullable: true, type: 'json' })
  callbackData?: TranscodingCallbackData;

  @Property()
  code!: number;

  @Property()
  data!: {
    task_id: string;
  };

  @Property()
  msg!: string;

  @ManyToOne(() => RawMedia)
  rawMedia!: Ref<RawMedia>;

  @Property()
  request_id!: string;

  @Property()
  sourceLink!: string;

  @Property()
  task_id!: string;

  @Enum(() => TranscodingTaskStatusEnum)
  taskStatus!: TranscodingTaskStatusEnum;

  @Property()
  templateName!: string;

  @Enum(() => VisionularContentType)
  type!: VisionularContentType;
}
