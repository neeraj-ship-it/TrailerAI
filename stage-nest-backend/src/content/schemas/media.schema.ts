import { Prop, Schema } from '@nestjs/mongoose';

import { Thumbnail } from '../schemas/thumbnail.schema';
import { Subtitle } from './subtitle.schema';
import { VisionularHls } from './visionularHls.schema';
import { PeripheralMediaType } from 'common/enums/media.enum';

@Schema({ _id: false })
export class Clip {
  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: String })
  video!: string;

  @Prop({ type: Boolean })
  waterMarkStatus!: boolean;
}
@Schema({ _id: false })
export class Media {
  @Prop({
    type: Clip,
  })
  clips!: Clip;

  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: String })
  hlsSourceLink!: string;

  @Prop({ type: Number })
  id!: number;

  @Prop({ type: Boolean })
  selectedPeripheralStatus!: boolean;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({
    type: Subtitle,
  })
  subtitle!: Subtitle;

  @Prop({
    type: Thumbnail,
  })
  thumbnail!: Thumbnail;

  @Prop({ type: String })
  title!: string;

  @Prop({ type: String })
  type!: string;

  @Prop({ type: Number })
  viewCount!: number;
}

@Schema({ _id: false })
export class MediaItemThumbnailData {
  @Prop({ type: String })
  sourceLink!: string;
}

@Schema({ _id: false })
export class MediaItemThumbnail {
  @Prop({ type: MediaItemThumbnailData })
  horizontal!: MediaItemThumbnailData;

  @Prop({ type: MediaItemThumbnailData })
  square!: MediaItemThumbnailData;

  @Prop({ type: MediaItemThumbnailData })
  vertical!: MediaItemThumbnailData;
}
@Schema({ _id: false })
export class MediaItem {
  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: String })
  hlsSourceLink!: string;

  @Prop({ type: Number })
  id!: number;

  @Prop({ enum: PeripheralMediaType, type: String })
  mediaType!: PeripheralMediaType;

  @Prop({ type: Boolean })
  selectedPeripheralStatus!: boolean;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({ type: Subtitle })
  subtitle!: Subtitle;

  @Prop({ type: MediaItemThumbnail })
  thumbnail!: MediaItemThumbnail;

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

  @Prop({ type: [String] })
  visionularHlsHistory?: string[];
}
