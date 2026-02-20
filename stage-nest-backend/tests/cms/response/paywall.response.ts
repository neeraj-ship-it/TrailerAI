export const paywallCreationResponse = {
  _id: expect.any(String),
  buttonPaywallItems: expect.any(Array),
  createdAt: expect.any(String),
  lang: expect.any(String),
  mediaImagePaywallItems: expect.any(Array),
  mediaVideoPaywallItems: expect.any(Array),
  name: expect.any(String),
  paywallId: expect.any(String),
  planId: 'test_plan_001',
  status: expect.any(String),
  targetDialects: expect.any(Array),
  textPaywallItems: expect.any(Array),
};

export const paywallUpdateResponse = {
  _id: expect.any(String),
  createdAt: expect.any(String),
  planId: 'test_plan_001',
  status: expect.any(String),
  targetDialects: expect.any(Array),
};

export const paywallListResponse = {
  data: expect.any(Array),
  pagination: {
    page: expect.any(Number),
    perPage: expect.any(Number),
  },
};

export const paywallDetailsResponse = (paywallId: string) => ({
  _id: paywallId,
  planId: 'test_plan_001',
});

export const planNameExistsResponse = {
  exists: expect.any(Boolean),
};
