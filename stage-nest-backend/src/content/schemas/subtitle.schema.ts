import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Subtitle {
  @Prop({ type: String })
  en!: string;

  @Prop({ type: String })
  hin!: string;
}
