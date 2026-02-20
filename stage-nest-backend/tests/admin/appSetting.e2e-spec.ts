import { TestBed } from '@automock/jest';

import { makeAuthenticatedAdminRequest } from '../utils/makeRequest';
import { pgConfigRequest } from './request/pGConfig.request';
import { paymentOptionEntityResponse } from './response/setting.response';
import { APP_CONFIGS } from 'common/configs/app.config';
import { Setting } from 'common/entities/setting.entity';
import { privilegesEnum } from 'src/admin/adminUser/enums/privileges.enum';
import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';
import { TestHelperService } from 'tests/testHelper';
import { getTestEntity } from 'tests/testSetup';

describe('MODULE: PG Config Tests', () => {
  const adminConfigApi = '/admin/appSetting/config';
  const { unit: adminAuthService } = TestBed.create(AdminAuthService).compile();
  let superAdminToken: string;
  beforeAll(async () => {
    // Data is now seeded globally during test setup
    superAdminToken = await adminAuthService.generateJwtToken({
      privileges: [privilegesEnum.FULL_ACCESS],
      role: 'Super Admin',
      userId: 'randomId',
    });
  });

  describe(`GET: ${adminConfigApi}`, () => {
    it('should get pg config response for various payment options', async () => {
      const response =
        await makeAuthenticatedAdminRequest(superAdminToken).get(
          adminConfigApi,
        );

      // Validate response type and data with expected data
      expect(response.body).toMatchSnapshot();
    });
  });

  describe(`PATCH: ${adminConfigApi}`, () => {
    it('should update pg config and return success response', async () => {
      const response = await makeAuthenticatedAdminRequest(superAdminToken)
        .patch(adminConfigApi)
        .send(pgConfigRequest);

      const settingEntity = getTestEntity<Setting>(Setting.name);

      if (!settingEntity) {
        throw new Error('Setting entity not found');
      }

      const setting = await settingEntity
        .findById(APP_CONFIGS.SETTING.ENTITY_ID)
        .lean()
        .select('commonForDialects.commonForLangs.paymentOptions');

      if (!setting) {
        throw new Error('Setting document not found');
      }

      if (Array.isArray(setting)) {
        throw new Error('Setting document is an array');
      }

      TestHelperService.validateMongoEntity(
        {
          paymentOptions:
            setting.commonForDialects.commonForLangs.paymentOptions,
        },
        paymentOptionEntityResponse,
      );

      const expectedResponse = {
        message: 'Successfully updated pg config',
        success: true,
      };
      TestHelperService.validateResponse(response, expectedResponse, 200);
    });
  });
});
