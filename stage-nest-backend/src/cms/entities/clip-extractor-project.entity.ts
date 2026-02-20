import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '@app/common/entities/base.entity';

export interface ClipExtractorContentMetadata {
  genre?: string;
  language?: string;
  title?: string;
}

export interface ClipExtractorClipData {
  beatOrder: number;
  beatType: string;
  clipId: string;
  clipUrl?: string;
  description: string;
  duration: number;
  emotionalTone: string;
  fileSize: number;
  isCompiled: boolean;
  s3Key?: string;
  score: number;
  timecodeEnd: string;
  timecodeStart: string;
}

@Schema({ timestamps: true })
export class ClipExtractorProject extends BaseModel<Types.ObjectId> {
  @Prop({ type: [Object], default: [] })
  clips: ClipExtractorClipData[] = [];

  @Prop({ type: Object })
  clipConfig?: {
    numClips?: number;
    minClipDuration?: number;
    maxClipDuration?: number;
    segmentMinDuration?: number;
    segmentMaxDuration?: number;
    generateCompiled?: boolean;
    compiledMaxDuration?: number;
  };

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: String })
  compiledVideoUrl?: string;

  @Prop({ type: Object })
  contentMetadata?: ClipExtractorContentMetadata;

  @Prop({ type: String })
  contentSlug?: string;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: String })
  extractionReportUrl?: string;

  @Prop({ default: 0, type: Number })
  progress: number = 0;

  @Prop({ required: true, type: String, unique: true })
  projectId!: string;

  @Prop({ type: String })
  progressStage?: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ default: 'idle', type: String })
  status: string = 'idle';

  @Prop({ required: true, type: String })
  videoUrl!: string;
}
