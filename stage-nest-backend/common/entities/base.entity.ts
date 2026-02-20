import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export abstract class BaseModel<
  T = Types.ObjectId | string | number,
> extends Document {
  declare readonly _id: T;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}
