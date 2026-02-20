import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class VisionularHls {
  @Prop({ type: String })
  hlsSourcelink!: string;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({ type: String })
  status!: string;

  @Prop({ type: String })
  visionularTaskId!: string;
}
