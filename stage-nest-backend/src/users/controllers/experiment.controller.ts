import { Controller } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';

import { CtxUser, Internal, type ContextUser } from '@app/auth';

import {
  ExperimentName,
  ExperimentResponseDto,
  FeatureGateName,
} from '../dtos/experiment.dto';
import { ExperimentService } from '../services/experiment.service';

@Controller('experiments')
export class ExperimentController {
  constructor(private readonly experimentService: ExperimentService) {}

  @TypedRoute.Get('feature-gate/:featureGateId/:userId')
  getFeatureGate(
    @TypedParam('userId') userId: string,
    @TypedParam('featureGateId') featureGateId: FeatureGateName,
  ) {
    return this.experimentService.getFeatureGate(userId, featureGateId);
  }

  @Internal()
  @TypedRoute.Get('experiment/:experimentId/:userId')
  getUserExperimentData(
    @TypedParam('userId') userId: string,
    @TypedParam('experimentId') experimentId: ExperimentName,
  ): Promise<ExperimentResponseDto> {
    return this.experimentService.getExperiment(userId, experimentId);
  }

  @TypedRoute.Put('/refresh-user-meta')
  refreshUserMeta(@CtxUser() user: ContextUser): Promise<{ success: boolean }> {
    return this.experimentService.refreshStatsigUser(user.id);
  }
}
