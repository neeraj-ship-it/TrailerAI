import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { BaseModel } from '../../../common/entities/base.entity';
import { ContentFormat } from '../../../common/entities/contents.entity';
import { Dialect } from '../../../common/enums/app.enum';
import { ContentType } from '../../../common/enums/common.enums';
import { StateCategory } from '../../../common/schema/specialAccess.schema';

// Nested schema for states array items
@Schema({ _id: true })
export class UserSpecialStateItem {
  @Prop({ enum: Dialect, required: true, type: String })
  content_dialect!: Dialect;

  @Prop({ enum: ContentFormat, required: true, type: String })
  content_format!: ContentFormat;

  @Prop({ type: Number })
  content_id!: number;

  @Prop({ enum: ContentType, required: true, type: String })
  content_type!: ContentType;

  @Prop({ type: Date })
  created_at?: Date;

  @Prop({ type: String })
  episode_slug?: string;

  @Prop({ type: String })
  show_slug?: string;

  @Prop({ enum: StateCategory, required: true, type: String })
  state_category!: StateCategory;

  @Prop({ required: true, type: Number })
  state_value!: number;

  @Prop({ type: Date })
  updated_at?: Date;
}

@Schema({ _id: false })
export class UserFreeMicrodramaItem {
  @Prop({ default: false, type: Boolean })
  banner_shown!: boolean;

  @Prop({ type: String })
  show_slug!: string;
}

@Schema({ collection: 'userContentStates', timestamps: true })
export class UserContentStates extends BaseModel<Types.ObjectId> {
  @Prop({ type: UserFreeMicrodramaItem })
  free_microdrama?: UserFreeMicrodramaItem;

  @Prop({ default: [], type: [UserSpecialStateItem] })
  states?: UserSpecialStateItem[];
}
