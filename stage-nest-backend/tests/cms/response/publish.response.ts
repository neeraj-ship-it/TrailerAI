export const publishSuccessResponse = () => ({
  paywall: {
    _id: expect.any(String),
    name: 'Test Paywall',
    status: 'active',
  },
  plan: {
    planId: 'test_plan_001',
    status: 'active',
  },
});
