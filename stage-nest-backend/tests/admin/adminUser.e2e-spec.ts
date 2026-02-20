import { TestBed } from '@automock/jest';

import { CreateAdminUserRequestDto } from 'src/admin/adminUser/dtos/createAdminUser.request.dto';

import { privilegesEnum } from 'src/admin/adminUser/enums/privileges.enum';
import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';
import { AccessEnum } from 'src/admin/refund/enums/privileges.enum';

import { makeAuthenticatedAdminRequest } from 'tests/utils/makeRequest';

const createUserRoute = '/admin/user/createUser';

describe('Admin User Service Tests', () => {
  const { unit: adminAuthService } = TestBed.create(AdminAuthService).compile();
  let superAdminToken: string;
  let partnerUserFullAccessToken: string;
  let partnerUserReadAccessToken: string;
  let partnerUserReadWriteAccessToken: string;
  beforeAll(async () => {
    [
      superAdminToken,
      partnerUserFullAccessToken,
      partnerUserReadAccessToken,
      partnerUserReadWriteAccessToken,
    ] = await Promise.all([
      adminAuthService.generateJwtToken({
        privileges: [privilegesEnum.FULL_ACCESS],
        role: 'Super Admin',
        userId: 'randomId',
      }),
      adminAuthService.generateJwtToken({
        privileges: ['REFUND_ALL'],
        role: 'Partner Full access',
        userId: 'randomId',
      }),
      adminAuthService.generateJwtToken({
        privileges: ['REFUND_READ'],
        role: 'Partner read access',
        userId: 'randomId',
      }),
      adminAuthService.generateJwtToken({
        privileges: ['REFUND_READ', 'REFUND_WRITE'],
        role: 'Partner read access',
        userId: 'randomId',
      }),
    ]);
  });

  it('Services should be defined', () => {
    expect(adminAuthService).toBeDefined();
  });
  describe('Create User Service Tests', () => {
    const testId = 'admin-test-001';
    const payload: CreateAdminUserRequestDto = {
      email: `${testId}@example.com`,
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
      phoneNumber: '1234563890',
      role: {
        privileges: [
          {
            access: AccessEnum.READ,
            code: 'FULL_ACCESS',
            module: 'Admin',
          },
        ],
        roleDescription: 'Admin role',
        roleName: 'Admin',
      },
    };
    it('should create admin user with all the privileges', async () => {
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .post(createUserRoute)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        email: `${testId}@example.com`,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234563890',
      });
      expect(response.body).toMatchSnapshot();
    });
    it('should not create admin user with partner token', async () => {
      const response = await makeAuthenticatedAdminRequest(
        partnerUserFullAccessToken,
      )
        .post(createUserRoute)
        .send({
          ...payload,
          email: `${testId}-partner@example.com`,
        });

      expect(response.status).toBe(403);
    });
    it('should not create admin user with partner read token', async () => {
      const response = await makeAuthenticatedAdminRequest(
        partnerUserReadAccessToken,
      )
        .post(createUserRoute)
        .send({
          ...payload,
          email: `${testId}-read@example.com`,
        });

      expect(response.status).toBe(403);
    });
    it('should not create admin user with partner read write token', async () => {
      const response = await makeAuthenticatedAdminRequest(
        partnerUserReadWriteAccessToken,
      )
        .post(createUserRoute)
        .send({
          ...payload,
          email: `${testId}-readwrite@example.com`,
        });

      expect(response.status).toBe(403);
    });
  });
});
