import * as jose from 'jose';

import { TestBed } from '@automock/jest';

import {
  JwtTokenPayloadDto,
  TokenType,
} from '../../libs/auth/src/dto/jwtTokenPayload.dto';
import { JwtService } from '../../libs/auth/src/services/jwtService';

describe('JwtService', () => {
  const { unit: jwtService } = TestBed.create(JwtService).compile();

  it('should be defined', () => {
    expect(jwtService).toBeDefined();
  });

  describe('decode', () => {
    it('should decode a valid token', async () => {
      const mockPayload: JwtTokenPayloadDto = {
        // appleId: 'apple.123456789',
        // email: 'user@example.com',
        exp: 1824324262,
        iat: 1724324262,
        // primaryMobileNumber: '+1234567890',
        rExp: 1723694942,
        rId: '550e8400-e29b-41d4-a716-446655440000',
        type: TokenType.ACCESS,
        userId: '123456789abcdef',
        // userType: UserType.NORMAL,
      };
      const token = await jwtService.encode(mockPayload);
      const result = await jwtService.decode(token);

      expect(result).toEqual(
        expect.objectContaining({
          // appleId: mockPayload.appleId,
          // email: mockPayload.email,
          // primaryMobileNumber: mockPayload.primaryMobileNumber,
          rExp: mockPayload.rExp,
          rId: mockPayload.rId,
          type: mockPayload.type,
          userId: mockPayload.userId,
          // userType: mockPayload.userType,
        }),
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      await expect(jwtService.decode('invalid_token')).rejects.toThrow(
        jose.errors.JWSInvalid,
      );
    });
  });

  describe('encode', () => {
    it('should encode a payload into a JWT', async () => {
      const mockPayload: JwtTokenPayloadDto = {
        // appleId: 'apple.123456789',
        // email: 'user@example.com',
        exp: 1724324262,
        iat: 1724331462,
        // primaryMobileNumber: '+1234567890',
        rExp: 1723694942,
        rId: '550e8400-e29b-41d4-a716-446655440000',
        type: TokenType.ACCESS,
        userId: '123456789abcdef',
        // userType: UserType.NORMAL,
      };
      const token = await jwtService.encode(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });
});
