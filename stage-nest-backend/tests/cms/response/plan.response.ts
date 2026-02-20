import { PlanTypesEnum } from '@app/payment/enums/plan.enum';

export const planCreationResponse = {
  actualPrice: 199,
  payingPrice: 149,
  planId: 'test_plan_001',
  planType: PlanTypesEnum.MONTHLY,
};

export const planUpdateResponse = {
  actualPrice: 299,
  payingPrice: 199,
  planId: 'test_plan_002',
  planType: PlanTypesEnum.ANNUAL,
};

export const planDetailsResponse = {
  actualPrice: expect.any(Number),
  payingPrice: expect.any(Number),
  planId: 'trial_quarter_07_lang_hing',
  planType: expect.any(String),
};

export const planVisibilityResponse = {
  visibility: true,
};
