import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ThumbnailRatio {
  @Prop({ type: String })
  gradient!: string;

  @Prop({ type: String })
  sourceLink!: string;
}

@Schema({ _id: false })
export class ThumbnailHorizontalOrientation {
  @Prop({ type: ThumbnailRatio })
  ratio1!: ThumbnailRatio;

  @Prop({ required: false, type: ThumbnailRatio })
  ratio2?: ThumbnailRatio;

  @Prop({ required: false, type: ThumbnailRatio })
  ratio3?: ThumbnailRatio;

  @Prop({ required: false, type: ThumbnailRatio })
  ratio4?: ThumbnailRatio;
}

@Schema({ _id: false })
export class ThumbnailVerticalOrientation {
  @Prop({ type: ThumbnailRatio })
  ratio1?: ThumbnailRatio;
}

@Schema({ _id: false })
export class ThumbnailSquareOrientation {
  @Prop({ type: ThumbnailRatio })
  ratio1!: ThumbnailRatio;
}

@Schema({ _id: false })
export class Thumbnail {
  @Prop({ required: true, type: ThumbnailHorizontalOrientation })
  horizontal!: ThumbnailHorizontalOrientation;

  @Prop({ type: ThumbnailSquareOrientation })
  square?: ThumbnailSquareOrientation;
  @Prop({ type: ThumbnailVerticalOrientation })
  vertical?: ThumbnailVerticalOrientation;
}
