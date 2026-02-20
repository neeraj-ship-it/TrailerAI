import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from './base.entity';

@Schema({ _id: false })
export class AirbyteRecommendationData {
  @Prop({ type: Number })
  COMPLETED_ABOVE_50!: number;

  @Prop({ type: Number })
  LAST_7DAYS_UNIQUE_WATCHERS!: number;

  @Prop({ type: String })
  SLUG!: string;

  @Prop({ type: Number })
  TOTAL_WATCH_TIME!: number;

  @Prop({ type: String })
  TYPE!: string;

  @Prop({ type: Number })
  UNIQUE_WATCHERS!: number;
}

@Schema({ collection: 'airbyte_raw_RECOMENDATION', timestamps: false })
export class AirbyteRecommendation extends BaseModel {
  @Prop({ type: AirbyteRecommendationData })
  _airbyte_data!: AirbyteRecommendationData;

  @Prop({ type: String })
  _airbyte_data_hash!: string;

  @Prop({ type: String })
  _airbyte_emitted_at!: string;
}
