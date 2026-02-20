import { Injectable } from '@nestjs/common';

import { ErrorHandlerService, Errors } from '@app/error-handler';

import { PlanFrequencyEnum } from '@app/payment/enums/plan.enum';
import { PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { Lang } from 'common/enums/app.enum';
import { PlanRepository } from 'common/repositories/plan.repository';
import { PlanV2Repository } from 'common/repositories/planV2.repository';

@Injectable()
export class PlanService {
  constructor(
    private readonly planV2Repository: PlanV2Repository,
    private readonly planRepository: PlanRepository,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private convertPlanTypeToFrequency(
    planType: PlanTypesEnum,
  ): PlanFrequencyEnum {
    switch (planType) {
      case PlanTypesEnum.ANNUAL:
        return PlanFrequencyEnum.ANNUAL;
      case PlanTypesEnum.BIWEEKLY:
        return PlanFrequencyEnum.BIWEEKLY;
      case PlanTypesEnum.WEEKLY:
        return PlanFrequencyEnum.WEEKLY;
      case PlanTypesEnum.HALF_YEARLY:
        return PlanFrequencyEnum.HALF_YEARLY;
      case PlanTypesEnum.MONTHLY:
        return PlanFrequencyEnum.MONTHLY;
      case PlanTypesEnum.QUARTERLY:
        return PlanFrequencyEnum.QUARTERLY;
      case PlanTypesEnum.TRIAL:
        return PlanFrequencyEnum.MONTHLY;
      default:
        throw Errors.PLAN.CANNOT_MIGRATE('Invalid plan type (frequency)');
    }
  }

  async migratePlanFromV1ToV2(oldPlanId: string) {
    const oldPlan = await this.errorHandler.raiseErrorIfNullAsync(
      this.planRepository.findOne({ planId: oldPlanId }),
      Errors.PLAN.NOT_FOUND(),
    );
    await this.errorHandler.raiseErrorIfExistsAsync(
      this.planV2Repository.findOne({ derivedFrom: oldPlanId }),
      Errors.PLAN.CANNOT_MIGRATE('Plan already migrated'),
    );

    const attachedPostTrialPlan = await this.errorHandler.raiseErrorIfNullAsync(
      this.planRepository.findOne({
        planId: oldPlan.postTrialPlan,
      }),
      Errors.PLAN.NOT_FOUND('Attached post trial plan not found'),
    );

    const newPlan = await this.planV2Repository.create({
      country: oldPlan.country,
      currency: oldPlan.currency,
      derivedFrom: oldPlan.planId,
      eligibility: {
        os: oldPlan.os ? [oldPlan.os] : [],
        platform: [],
      },
      localizedDisplayConfig: {
        features: oldPlan.cardOptionen.map((feature, index) => ({
          [Lang.EN]: feature.replace('\\n', '\n'),
          [Lang.HIN]: oldPlan.cardOptionhin[index].replace('\\n', '\n'),
        })),
        offerText: {
          [Lang.EN]: oldPlan.offerTextEn,
          [Lang.HIN]: oldPlan.offerTextHin,
        },
        type: {
          [Lang.EN]: oldPlan.planTypeText,
          [Lang.HIN]: oldPlan.planTypeTextHin,
        },
      },
      name: oldPlan.postTrialPlan,
      pricing: {
        displayAmount: oldPlan.actualPrice,
        netAmount: attachedPostTrialPlan.payingPrice,
        trialAmount: oldPlan.payingPrice,
      },
      status: oldPlan.status,
      trialPlanId: oldPlan.planId,
      validity: {
        frequency: this.convertPlanTypeToFrequency(oldPlan.planType),
        planType: oldPlan.planType,
        trialDays: oldPlan.totalDays, // giving trialDays using total days of a trial plan
      },
    });
    await this.planV2Repository.persistAndFlush(newPlan);
    return this.planV2Repository.findOneOrFail(
      { derivedFrom: oldPlan.planId },
      {
        failHandler: () =>
          Errors.PLAN.CANNOT_MIGRATE('Could not find newly migrated plan'),
      },
    );
  }
}
