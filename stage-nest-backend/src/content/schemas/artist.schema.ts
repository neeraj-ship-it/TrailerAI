import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Artist {
  @Prop({ type: String })
  callingName!: string;

  @Prop({ type: String })
  city!: string;

  @Prop({ type: String })
  display!: string;

  @Prop({ type: String })
  firstName!: string;

  @Prop({ type: String })
  gender!: string;

  @Prop({ type: String })
  gradient?: string;

  @Prop({ type: Number })
  id!: number;

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
