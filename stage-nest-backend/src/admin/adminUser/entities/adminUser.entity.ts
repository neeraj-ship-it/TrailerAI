import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { Role } from './role.entity';
import { BaseModel } from 'common/entities/base.entity';

@Schema({ autoIndex: true, timestamps: true }) // autoIndex is mandatory if we want to create index directly from the schema definition
export class AdminUser extends BaseModel {
  @Prop({ index: true, required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true }) // TODO: should be made unique in future & indexed
  phoneNumber!: string;

  @Prop({ ref: Role.name, type: Types.ObjectId })
  role!: Types.ObjectId;

  @Prop({ required: true })
  salt!: string;
}
