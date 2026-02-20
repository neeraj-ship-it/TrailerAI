import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '@app/common/entities/base.entity';

export enum FrameExtractionStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  GENERATING = 'generating',
  IDLE = 'idle',
}

export enum PosterGenerationStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  GENERATING = 'generating',
  IDLE = 'idle',
}

export interface PosterProjectStatus {
  frames: FrameExtractionStatus;
  poster: PosterGenerationStatus;
}

const DEFAULT_STATUS: PosterProjectStatus = {
  frames: FrameExtractionStatus.IDLE,
  poster: PosterGenerationStatus.IDLE,
};

@Schema({ timestamps: true })
export class PosterProject extends BaseModel<Types.ObjectId> {
  @Prop({ type: String })
  contentSlug?: string;

  @Prop({ required: true, type: String, unique: true })
  name!: string;

  @Prop({ type: Types.ObjectId })
  rawMediaId?: Types.ObjectId;

  @Prop({ default: DEFAULT_STATUS, type: Object })
  status: PosterProjectStatus = DEFAULT_STATUS;

  @Prop({ default: [], index: true, type: [String] })
  tags: string[] = [];
}
