import { Prop, Schema } from '@nestjs/mongoose';

import { DisputeStatusEnum } from '../enums/dispute.enums';
import { PaymentGatewayEnum } from '../enums/paymentGateway.enums';
import { BaseModel } from 'common/entities/base.entity';

@Schema({ minimize: false, timestamps: true })
export class Dispute extends BaseModel {
  @Prop({
    required: true,
    type: Number,
  })
  amount!: number;

  @Prop({
    type: Date,
  })
  disputeDeadlineTime!: Date;

  @Prop({
    required: true,
    type: String,
    unique: true,
  })
  disputeId!: string;

  @Prop({
    required: true,
    type: Date,
  })
  disputeTime!: Date;

  @Prop({
    type: String,
  })
  errorMessage?: string;

  @Prop({
    required: true,
    type: Object,
  })
  payload!: object; // TODO: Fix this object type

  @Prop({
    enum: PaymentGatewayEnum,
    required: true,
    type: String,
  })
  paymentGateway!: PaymentGatewayEnum;

  @Prop({
    required: true,
    type: String,
  })
  paymentId!: string;

  @Prop({
    type: String,
  })
  pgDocumentId!: string;

  @Prop({
    enum: DisputeStatusEnum,
    required: true,
    type: String,
  })
  status!: DisputeStatusEnum;
}
