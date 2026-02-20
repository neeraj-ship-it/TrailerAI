import { Prop, Schema } from '@nestjs/mongoose';

import { Lang } from '@app/common/enums/app.enum';
import { BaseModel } from 'common/entities/base.entity';

export enum UserCultureStatusEnum {
  'ACTIVE' = 'active',
  'INACTIVE' = 'inactive',
}

class ScreenData {
  @Prop({ required: true })
  title!: string;
}
export class UserCultureScreens {
  @Prop({ required: true, type: ScreenData })
  confirmationScreen!: ScreenData;

  @Prop({ required: true, type: ScreenData })
  selectionScreen!: ScreenData;

  @Prop({ required: true, type: ScreenData })
  updateScreen!: ScreenData;
}

class UserCultureData {
  @Prop({ required: true })
  imageUrl!: string;

  @Prop({ required: true, type: UserCultureScreens })
  screens!: UserCultureScreens;

  @Prop({ required: true })
  title!: string;
}

@Schema({
  strict: true,
  timestamps: true,
})
export class UserCultures extends BaseModel {
  @Prop({ type: Number })
  declare _id: number;

  @Prop({ required: true, type: String })
  abbreviation!: string;

  @Prop({ required: true, type: Boolean })
  isEnabled!: boolean;

  // TODO: Move this to seperate schema
  @Prop({ required: true, type: Object })
  [Lang.EN]!: UserCultureData;

  @Prop({ required: true, type: Object })
  [Lang.HIN]!: UserCultureData;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ enum: UserCultureStatusEnum, required: true, type: String })
  status!: UserCultureStatusEnum;
}
