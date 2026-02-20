export const validPublishRequest = (paywallId: string) => ({
  paywallId,
});

export const invalidPublishRequest = {
  paywallId: '507f1f77bcf86cd799439011',
};

export const emptyPublishRequest = {};

export const malformedPublishRequest = {
  paywallId: 'invalid-id-format',
};
