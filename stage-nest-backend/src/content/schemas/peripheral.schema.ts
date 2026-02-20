import { Prop, Schema } from '@nestjs/mongoose';

import { VisionularHls } from './visionularHls.schema';

@Schema({ _id: false })
class PeripheralThumbnail {
  @Prop({ type: String })
  sourceLink!: string;
}

@Schema({ _id: false })
export class PeripheralThumbnailSet {
  @Prop({ type: PeripheralThumbnail })
  horizontal?: PeripheralThumbnail;

  @Prop({ type: PeripheralThumbnail })
  square?: PeripheralThumbnail;

  @Prop({ type: PeripheralThumbnail })
  tv_image?: PeripheralThumbnail;

  @Prop({ type: PeripheralThumbnail })
  vertical?: PeripheralThumbnail;
}

@Schema({ _id: false })
export class Peripheral {
  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: String })
  hlsSourceLink!: string;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({ type: PeripheralThumbnailSet })
  thumbnail!: PeripheralThumbnailSet;

  @Prop({ type: String })
  title!: string;

  @Prop({ type: String })
  type!: string;

  @Prop({ type: Number })
  viewCount!: number;

  @Prop({ type: VisionularHls })
  visionularHls?: VisionularHls;

  @Prop({ type: VisionularHls })
  visionularHlsH265?: VisionularHls;
}
