import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '@app/common/entities/base.entity';

// Embedded types for variant metadata
export interface ShotSequenceItem {
  audio_recommendation?: string;
  dialogue_line?: string | null;
  is_hook_ending?: boolean;
  notes?: string;
  order: number;
  purpose?: string;
  recommended_duration?: number;
  scene_ref?: string;
  text_overlay?: string | null;
  timecode_end?: string;
  timecode_start?: string;
  transition_duration?: number;
  transition_in?: string;
}

export interface VariantStructure {
  cliffhanger?: string;
  description?: string;
  hook_strength?: number;
  phases?: string[];
}

export interface VariantMetadata {
  actual_duration?: number;
  character_intro_present?: boolean;
  closing_tag?: string;
  hook_ending_present?: boolean;
  music_recommendation?: {
    has_dialogue_gaps?: boolean;
    style?: string;
  };
  opening_hook?: string;
  production_ready?: boolean;
  shot_sequence?: ShotSequenceItem[];
  structure?: VariantStructure;
  suspense_peak?: number;
  target_duration?: number;
  text_overlays?: {
    phase?: string;
    text?: string;
    timing?: number;
  }[];
}

@Schema({ timestamps: true })
export class TrailerVariant extends BaseModel<Types.ObjectId> {
  @Prop({ type: Number })
  confidence?: number;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Number })
  fileSize?: number;

  @Prop({ type: Object })
  metadata?: VariantMetadata;

  @Prop({ required: true, type: String })
  s3Key!: string;

  @Prop({ index: true, required: true, type: String })
  style!: string;

  @Prop({ type: String })
  title?: string;

  @Prop({ index: true, required: true, type: Types.ObjectId })
  trailerProjectId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  variantId!: string;
}
