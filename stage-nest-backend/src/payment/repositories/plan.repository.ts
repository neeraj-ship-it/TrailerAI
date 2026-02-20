import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Plan } from 'common/entities/plan.entity';
import { BaseRepository } from 'common/repositories/base.repository';

@Injectable()
export class PlanRepository extends BaseRepository<Plan> {
  constructor(@InjectModel(Plan.name) private readonly planModel: Model<Plan>) {
    super(planModel);
  }
}
