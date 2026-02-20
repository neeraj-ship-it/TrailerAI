import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';
import { AccessEnum } from 'src/admin/refund/enums/privileges.enum';
@Schema({ _id: false })
class Privileges {
  @Prop({ enum: AccessEnum, required: true, type: String })
  access!: AccessEnum;

  @Prop({ required: true, type: String })
  code!: string;

  @Prop({ required: true, type: String })
  module!: string;
}

@Schema()
export class Role extends BaseModel {
  @Prop({ type: [Privileges] })
  privileges!: Privileges[];

  @Prop({ required: true, type: String })
  roleDescription!: string;

  @Prop({ required: true, type: String, unique: true })
  roleName!: string;
}
