import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Category {
  @Prop({ required: true, type: Number })
  id!: number;

  @Prop({ required: true, type: String })
  name!: string;
}
