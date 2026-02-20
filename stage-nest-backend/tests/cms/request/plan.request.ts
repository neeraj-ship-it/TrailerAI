import { PlanTypesEnum } from '@app/payment/enums/plan.enum';
import { DayCountEnum } from 'common/entities/plan.entity';

export const validPlanRequest = {
  actualPrice: 199,
  dayCount: DayCountEnum.DEFAULT,
  mandateSetupPayingPrice: 99,
  partOfABTestGroup: false,
  payingPrice: 149,
  planId: 'test_plan_001',
  planType: PlanTypesEnum.MONTHLY,
};

export const updatedPlanRequest = {
  actualPrice: 299,
  dayCount: DayCountEnum.DEFAULT,
  mandateSetupPayingPrice: 149,
  partOfABTestGroup: true,
  payingPrice: 199,
  planId: 'test_plan_002',
  planType: PlanTypesEnum.ANNUAL,
};

export const invalidPlanRequest = {
  actualPrice: -100,
  dayCount: DayCountEnum.DEFAULT,
  mandateSetupPayingPrice: 99,
  partOfABTestGroup: false,
  payingPrice: 149,
  planId: 'test_plan_invalid',
  planType: PlanTypesEnum.MONTHLY,
};

export const unauthorizedPlanRequest = {
  actualPrice: 199,
  dayCount: DayCountEnum.DEFAULT,
  mandateSetupPayingPrice: 99,
  partOfABTestGroup: false,
  payingPrice: 149,
  planId: 'test_plan_unauth',
  planType: PlanTypesEnum.MONTHLY,
};
