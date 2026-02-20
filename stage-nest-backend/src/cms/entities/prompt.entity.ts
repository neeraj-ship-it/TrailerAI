import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '@app/common/entities/base.entity';
import { GeminiAspectRatio } from 'common/interfaces/ai.interface';

export interface UserPromptInput {
  customPrompt?: string;
  description?: string;
  emotionType?: string;
  genre?: string;
  imageUrls: string[];
  ratios?: GeminiAspectRatio[];
  style?: string;
  title?: string;
  titleImageUrl?: string;
}

@Schema({ timestamps: true })
export class Prompt extends BaseModel<Types.ObjectId> {
  @Prop({
    index: true,
    ref: 'PosterProject',
    required: true,
    type: Types.ObjectId,
  })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Object })
  userInput!: UserPromptInput;

  @Prop({ required: true, type: Number })
  version!: number;
}
