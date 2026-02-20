import { Inject, Injectable } from '@nestjs/common';

import { json } from 'typia';

import {
  ExperimentGroupName,
  ExperimentName,
  ExperimentResponseDto,
  ExperimentValue,
} from '../dtos/experiment.dto';
import { StatsigService } from './statsig.service';
import { ErrorHandlerService } from '@app/error-handler';
import { EventService } from '@app/events';
import { Events } from '@app/events/interfaces/events.interface';
import { OS } from 'common/enums/app.enum';

@Injectable()
export class ExperimentService {
  constructor(
    @Inject() private errorHandler: ErrorHandlerService,
    @Inject() private statsigService: StatsigService,
    @Inject() private readonly eventsService: EventService,
  ) {}

  async getExperiment(
    userId: string,
    experimentId: ExperimentName,
  ): Promise<ExperimentResponseDto> {
    const statsigUser = await this.statsigService.getStatsigUser(userId);
    const experiment = await this.statsigService.getExperiment(
      experimentId,
      statsigUser,
    );

    const { groupName, idType, name, ruleID, value } = experiment;

    const experimentResponse: ExperimentResponseDto = {
      groupName:
        groupName === undefined ? null : (groupName as ExperimentGroupName),
      idType,
      name: name as ExperimentName,
      ruleID,
      statsigUserProperty: this.statsigService.mapToStatsigUserProperty(
        statsigUser.custom,
      ),
      value: value as ExperimentValue,
    };
    this.eventsService.trackEvent({
      app_client_id: null,
      key: Events.STATSIG_EXPERIMENT_EVALUATED,
      os: OS.OTHER,
      payload: {
        group_name: groupName === undefined ? null : groupName,
        id_type: idType,
        name,
        rule_id: ruleID,
        statsig_user_property: json.stringify(statsigUser.custom),
        timestamp: new Date(),
        value: json.stringify(value),
      },
      user_id: userId,
    });
    return experimentResponse;
  }

  async getExperimentValueWithGroupName<T, S>(
    userId: string,
    experimentId: ExperimentName,
  ): Promise<{ value: T; groupName: S }> {
    const experiment = await this.getExperiment(userId, experimentId);
    const { groupName, value } = experiment;
    return { groupName: groupName as S, value: value as T };
  }

  async getFeatureGate(userId: string, featureGate: string) {
    return this.statsigService.checkFeatureGate(featureGate, userId);
  }

  async refreshStatsigUser(userId: string) {
    const result = await this.statsigService.refreshStatsigUser(userId);
    return { success: result };
  }
}
