import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Genre {
  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  name!: string;
}
