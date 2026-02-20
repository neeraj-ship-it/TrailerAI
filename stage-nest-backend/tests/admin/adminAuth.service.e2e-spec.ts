import { TestBed } from '@automock/jest';

import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';

describe('AdminAuthService', () => {
  const { unit: adminAuthService } = TestBed.create(AdminAuthService).compile();

  it('Auth Service should be defined', () => {
    expect(adminAuthService).toBeDefined();
  });

  describe('Auth service tests', () => {
    it('should verifyPassword with correct password', async () => {
      const result = await adminAuthService.verifyPassword(
        'Sumit@123',
        'e08f40e5c3242c61d86df26ad08d89342e4d385bc176e5d69b5a0860ad12009474c3b38b6ad7398f06b2a5f408aaa37b7ac9e60e7a110292f27c0e5cf982a3d0',
        'f912b799a5704a4cbae6615e729dd875',
      );
      expect(result).toEqual(true);
    });

    it('should verifyPassword with incorrect password', async () => {
      expect(
        adminAuthService.verifyPassword(
          'Sumit@ABC',
          'e08f40e5c3242c61d86df26ad08d89342e4d385bc176e5d69b5a0860ad12009474c3b38b6ad7398f06b2a5f408aaa37b7ac9e60e7a110292f27c0e5cf982a3d0',
          'f912b799a5704a4cbae6615e729dd875',
        ),
      ).toEqual(false);
    });

    it('should create a hashed password with salt and never reproduce same hassed password for same password', async () => {
      const result = adminAuthService.generateHashedPassword('Sumit@123');
      expect(result.hashedPassword).toHaveLength(128);
      expect(result.salt).toHaveLength(32);
      const verifiedResult = adminAuthService.generateHashedPassword(
        'Sumit@123',
        result.salt,
      );
      expect(verifiedResult.hashedPassword).toEqual(result.hashedPassword);
      const anotherResult =
        adminAuthService.generateHashedPassword('Sumit@123');
      expect(anotherResult.hashedPassword).not.toEqual(result.hashedPassword);
      expect(anotherResult.salt).not.toEqual(result.salt);
    });

    it('should generate a valid jwt token', async () => {
      const result = await adminAuthService.generateJwtToken({
        privileges: ['Test_Privilege'],
        role: 'admin',
        userId: '1',
      });

      expect(typeof result).toBe('string');
      expect(result.split('.').length).toBe(3);

      const decoded = JSON.parse(atob(result.split('.')[1]));
      expect(decoded.userId).toBe('1');
      expect(decoded.role).toBe('admin');
      expect(decoded.privileges).toEqual(['Test_Privilege']);
    });

    it('should decode a valid jwt token', async () => {
      const token = await adminAuthService.generateJwtToken({
        privileges: ['Test_Privilege'],
        role: 'admin',
        userId: '1',
      });
      const decoded = await adminAuthService.decode(token);
      expect(decoded.userId).toBe('1');
      expect(decoded.role).toBe('admin');
      expect(decoded.privileges).toEqual(['Test_Privilege']);
    });
  });
});
