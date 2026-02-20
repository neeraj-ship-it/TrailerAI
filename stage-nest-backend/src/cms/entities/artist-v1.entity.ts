import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

@Schema()
export class Artist extends BaseModel {
  @Prop({ type: String })
  callingName!: string;

  @Prop({ type: String })
  city!: string;

  @Prop({ type: String })
  description!: string;

  @Prop({ type: String })
  display!: string;

  @Prop({ type: String })
  displayLanguage!: string;

  @Prop({ type: String })
  firstName!: string;

  @Prop({ type: String })
  gender!: string;

  @Prop({ type: String })
  gradient?: string;

  @Prop({ type: Number })
  declare id: number;

  @Prop({ type: String })
  lastName!: string;

  @Prop({ type: String })
  name!: string;

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: String })
  profilePic!: string;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: String })
  status!: string;
}
