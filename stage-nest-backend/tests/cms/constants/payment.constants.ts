// Test Plan IDs
export const TEST_PLAN_IDS = {
  INVALID: 'test_plan_invalid',
  NON_EXISTENT: 'non_existent_plan',
  UNAUTHORIZED: 'test_plan_unauth',
  VALID: 'trial_quarter_07_lang_hing',
} as const;

// Test Paywall Names
export const TEST_PAYWALL_NAMES = {
  UNAUTHORIZED: 'Unauthorized Paywall',
  VALID: 'Test Paywall',
} as const;

// Test User IDs
export const TEST_USER_IDS = {
  ADMIN: 'test-admin-user-id',
  LIMITED_ADMIN: 'test-limited-admin-user-id',
} as const;

// Test Roles
export const TEST_ROLES = {
  LIMITED_ADMIN: 'Limited Admin',
  SUPER_ADMIN: 'Super Admin',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  CREATED: 201,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  OK: 200,
  UNAUTHORIZED: 401,
} as const;

// Test Object IDs
export const TEST_OBJECT_IDS = {
  INVALID_FORMAT: 'invalid-id-format',
  VALID_FORMAT: '507f1f77bcf86cd799439011',
} as const;

// Test URLs
export const TEST_URLS = {
  INVALID_IMAGE: 'https://example.com/invalid-image.jpg',
  PAYWALL_IMAGE: 'https://example.com/paywall-image.jpg',
  PAYWALL_IMAGE_UPDATED: 'https://example.com/updated-paywall-image.jpg',
  PAYWALL_VIDEO: 'https://example.com/paywall-video.mp4',
  PAYWALL_VIDEO_UPDATED: 'https://example.com/updated-paywall-video.mp4',
  PERIPHERAL_IMAGE: 'https://example.com/peripheral-image.jpg',
  PERIPHERAL_IMAGE_UPDATED: 'https://example.com/peripheral-image-updated.jpg',
  RENEWAL_IMAGE: 'https://example.com/renewal-image.jpg',
  RENEWAL_IMAGE_UPDATED: 'https://example.com/renewal-image-updated.jpg',
  UNAUTHORIZED_IMAGE: 'https://example.com/unauthorized-image.jpg',
} as const;

// Test Colors
export const TEST_COLORS = {
  BACKGROUND: '#f8f9fa',
  PRIMARY: '#007bff',
  SUCCESS: '#28a745',
  WHITE: '#ffffff',
} as const;

// Test Text Content
export const TEST_TEXT = {
  GET_PREMIUM: 'Get Premium',
  SUBSCRIBE_NOW: 'Subscribe Now',
  WELCOME_MESSAGE: 'Welcome to our premium service!',
} as const;

// Test Pagination
export const TEST_PAGINATION = {
  PAGE: '1',
  PER_PAGE: '10',
} as const;

// Test OS and Country
export const TEST_LOCATION = {
  COUNTRY: 'IN',
  OS: 'android',
} as const;

// Test Plan Names
export const TEST_PLAN_NAMES = {
  VALID: 'trial_quarter_07_lang_hing',
} as const;
