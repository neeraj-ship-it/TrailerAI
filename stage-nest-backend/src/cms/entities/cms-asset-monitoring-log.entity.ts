import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from '@app/common/entities/base.entity';

@Schema({ collection: 'cmsAssetMonitoringLog', timestamps: true })
export class CmsAssetMonitoringLog extends BaseModel {
  @Prop({ default: 0, type: Number })
  noOfMoviesMissingAsset!: number;

  @Prop({ default: 0, type: Number })
  noOfShowsMissingAsset!: number;

  @Prop({ default: 0, type: Number })
  noOfTotalContentMissingAsset!: number;
}
