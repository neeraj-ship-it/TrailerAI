import { Prop, Schema } from '@nestjs/mongoose';

import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { BaseModel } from 'common/entities/base.entity';
import { ContentFormat } from 'common/entities/contents.entity';

export interface CreateDeepLinkParams {
  contentId: number;
  contentType: ContentType;
  dialect: Dialect;
  format?: ContentFormat;
  lang: Lang;
  slug: string;
}

export interface DeepLinkResponse {
  appsflyerUrl?: string;
  createdAt?: Date | string;
  deepLinkId?: string;
  error_message?: string;
  lastRefreshedAt?: Date | string;
  success: boolean;
}

@Schema({ timestamps: true, versionKey: false })
export class AppsflyerDeeplink extends BaseModel {
  @Prop({ required: true, type: String })
  appsflyerUrl!: string;

  @Prop({ required: true, type: Number })
  contentId!: number;

  @Prop({ enum: ContentType, required: true })
  contentType!: ContentType;

  @Prop({ required: true, type: String })
  deepLinkId!: string;

  @Prop({ enum: Dialect, required: true })
  dialect!: Dialect;

  @Prop({ enum: ContentFormat })
  format?: ContentFormat;

  @Prop({ enum: Lang, required: true })
  language!: Lang;

  @Prop({ default: Date.now, type: Date })
  lastRefreshedAt!: Date;

  @Prop({ required: true, type: String })
  slug!: string;
}
