import { TestBed } from '@automock/jest';

import {
  makeAuthenticatedAdminRequest,
  makePublicRequest,
} from '../utils/makeRequest';
import { privilegesEnum } from 'src/admin/adminUser/enums/privileges.enum';
import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';

// Request imports
import {
  validPaywallRequest,
  invalidPaywallRequest,
  unauthorizedPaywallRequest,
} from './request/paywall.request';
import {
  validPlanRequest,
  updatedPlanRequest,
  invalidPlanRequest,
  unauthorizedPlanRequest,
} from './request/plan.request';
import {
  validPublishRequest,
  invalidPublishRequest,
  emptyPublishRequest,
  malformedPublishRequest,
} from './request/publish.request';
import { toggleVisibilityRequest } from './request/visibility.request';

// Response imports
import {
  paywallCreationResponse,
  paywallUpdateResponse,
  paywallDetailsResponse,
  planNameExistsResponse,
} from './response/paywall.response';
import {
  planCreationResponse,
  planUpdateResponse,
  planDetailsResponse,
  planVisibilityResponse,
} from './response/plan.response';
import { publishSuccessResponse } from './response/publish.response';

// Constants imports
import {
  TEST_PLAN_IDS,
  TEST_USER_IDS,
  TEST_ROLES,
  HTTP_STATUS,
  TEST_OBJECT_IDS,
  TEST_PAGINATION,
  TEST_LOCATION,
  TEST_PLAN_NAMES,
} from './constants/payment.constants';

describe('MODULE: Payment Controller Tests', () => {
  let adminToken: string;
  let createdPaywallId: string;
  const { unit: adminAuthService } = TestBed.create(AdminAuthService).compile();

  beforeAll(async () => {
    // Generate proper admin token with required privileges for payment endpoints
    adminToken = await adminAuthService.generateJwtToken({
      privileges: [
        privilegesEnum.FULL_ACCESS,
        privilegesEnum.PAYWALL_ALL,
        privilegesEnum.PAYWALL_WRITE,
        privilegesEnum.PAYWALL_READ,
      ],
      role: TEST_ROLES.SUPER_ADMIN,
      userId: TEST_USER_IDS.ADMIN,
    });
  });

  describe('Plan Operations', () => {
    describe('POST: /cms/payment/plans', () => {
      it('should create a plan with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/plans')
          .send(validPlanRequest);

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body).toMatchObject(planCreationResponse);
      });

      it('should update existing plan when planId already exists', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/plans')
          .send(updatedPlanRequest);

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body).toMatchObject(planUpdateResponse);
      });

      it('should return 400 for invalid plan data', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/plans')
          .send(invalidPlanRequest);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest()
          .post('/cms/payment/plans')
          .send(unauthorizedPlanRequest);

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });

    describe('GET: /cms/payment/plan/:planId', () => {
      it('should get plan details with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/plan/${TEST_PLAN_IDS.VALID}`,
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body).toMatchObject(planDetailsResponse);
      });

      it('should return 404 for non-existent plan', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/plan/${TEST_PLAN_IDS.NON_EXISTENT}`,
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest().get(
          `/cms/payment/plan/${TEST_PLAN_IDS.VALID}`,
        );

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });

    describe('PATCH: /cms/payment/toggle-plan-visibility/:planId', () => {
      it('should toggle plan visibility with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .patch(`/cms/payment/toggle-plan-visibility/${TEST_PLAN_IDS.VALID}`)
          .send(toggleVisibilityRequest);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body).toMatchObject(planVisibilityResponse);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest()
          .patch(`/cms/payment/toggle-plan-visibility/${TEST_PLAN_IDS.VALID}`)
          .send(toggleVisibilityRequest);

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });
  });

  describe('Paywall Operations', () => {
    describe('POST: /cms/payment/paywall', () => {
      it('should create a paywall with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/paywall')
          .send(validPaywallRequest);

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body).toMatchObject(paywallCreationResponse);
        expect(response.body.buttonPaywallItems).toHaveLength(1);
        expect(response.body.mediaImagePaywallItems).toHaveLength(1);
        expect(response.body.mediaVideoPaywallItems).toHaveLength(1);
        expect(response.body.textPaywallItems).toHaveLength(1);
        createdPaywallId = response.body.paywallId;
      });

      it('should update existing paywall when name matches', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/paywall')
          .send(validPaywallRequest);

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body).toMatchObject(paywallUpdateResponse);
      });

      it('should return 500 for invalid paywall data', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/paywall')
          .send(invalidPaywallRequest);

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest()
          .post('/cms/payment/paywall')
          .send(unauthorizedPaywallRequest);

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });

    describe('GET: /cms/payment/paywalls', () => {
      it('should get paywall list with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          '/cms/payment/paywalls',
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('perPage');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should support pagination parameters', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .get('/cms/payment/paywalls')
          .query({
            page: TEST_PAGINATION.PAGE,
            perPage: TEST_PAGINATION.PER_PAGE,
          });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.pagination).toHaveProperty(
          'page',
          TEST_PAGINATION.PAGE,
        );
        expect(response.body.pagination).toHaveProperty(
          'perPage',
          TEST_PAGINATION.PER_PAGE,
        );
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest().get('/cms/payment/paywalls');

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });

    describe('GET: /cms/payment/paywall/:paywallId', () => {
      it('should get paywall details with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/paywall/${createdPaywallId}`,
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body).toMatchObject(
          paywallDetailsResponse(createdPaywallId),
        );
        expect(response.body._id).toBe(createdPaywallId);
      });

      it('should return 400 for non-existent paywall', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/paywall/${TEST_OBJECT_IDS.VALID_FORMAT}`,
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest().get(
          `/cms/payment/paywall/${createdPaywallId}`,
        );

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });
  });

  describe('Additional Operations', () => {
    describe('GET: /cms/payment/plan-availability/:planId/:os/:country', () => {
      it('should return 400 for plan availability check (validation error)', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/plan-availability/${TEST_PLAN_IDS.VALID}/${TEST_LOCATION.OS}/${TEST_LOCATION.COUNTRY}`,
        );

        // Returns 400 due to validation requirements or missing data
        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 400 without authentication', async () => {
        const response = await makePublicRequest().get(
          `/cms/payment/plan-availability/${TEST_PLAN_IDS.VALID}/${TEST_LOCATION.OS}/${TEST_LOCATION.COUNTRY}`,
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });
    });

    describe('GET: /cms/payment/check-plan-name-exists/:os/:country/:planName', () => {
      it('should check if plan name exists with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken).get(
          `/cms/payment/check-plan-name-exists/${TEST_LOCATION.OS}/${TEST_LOCATION.COUNTRY}/${TEST_PLAN_NAMES.VALID}`,
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body).toMatchObject(planNameExistsResponse);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest().get(
          `/cms/payment/check-plan-name-exists/${TEST_LOCATION.OS}/${TEST_LOCATION.COUNTRY}/${TEST_PLAN_NAMES.VALID}`,
        );

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });
    });
  });

  describe('Publish Operations', () => {
    describe('POST: /cms/payment/publish', () => {
      it('should publish paywall with proper admin authentication', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/publish')
          .send(validPublishRequest(createdPaywallId));

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body).toMatchObject(publishSuccessResponse());
      });

      it('should return 400 for invalid paywall ID', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/publish')
          .send(invalidPublishRequest);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 400 for missing paywall ID', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/publish')
          .send(emptyPublishRequest);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 400 for invalid paywall ID format', async () => {
        const response = await makeAuthenticatedAdminRequest(adminToken)
          .post('/cms/payment/publish')
          .send(malformedPublishRequest);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should return 401 without authentication', async () => {
        const response = await makePublicRequest()
          .post('/cms/payment/publish')
          .send(validPublishRequest(createdPaywallId));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      });

      it('should return 403 with insufficient privileges', async () => {
        // Create a token with limited privileges
        const limitedToken = await adminAuthService.generateJwtToken({
          privileges: [privilegesEnum.PAYWALL_READ], // Only read access
          role: TEST_ROLES.LIMITED_ADMIN,
          userId: TEST_USER_IDS.LIMITED_ADMIN,
        });

        const response = await makeAuthenticatedAdminRequest(limitedToken)
          .post('/cms/payment/publish')
          .send(validPublishRequest(createdPaywallId));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      });
    });
  });
});
