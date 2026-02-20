import request from 'supertest';

import { TestBed } from '@automock/jest';

import { ExtraGlobals } from '../types/global.types';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Dialect, Lang, OS, Platform } from '@app/common/enums/app.enum';
import {
  JwtTokenPayloadDto,
  TokenType,
} from 'libs/auth/src/dto/jwtTokenPayload.dto';
import { JwtService } from 'libs/auth/src/services/jwtService';

interface GenerateAuthToken {
  userId: string;
}

export const generateAuthToken = async (
  generateAuthTokenPayload?: GenerateAuthToken,
) => {
  const { userId = '5f7c6b5e1c9d440000a1b1a1' } =
    generateAuthTokenPayload || {};

  // Use TestBed to create JwtService instance directly
  const { unit: jwtService } = TestBed.create(JwtService).compile();

  const payload: JwtTokenPayloadDto = {
    // appleId: 'apple.123456789',
    // email: 'user@example.com',
    exp: 1823693142,
    iat: 1723691342,
    // primaryMobileNumber: '+1234567890',
    rExp: 1723694942,
    rId: '550e8400-e29b-41d4-a716-446655440000',
    type: TokenType.ACCESS,
    userId: userId,
    // userType: UserType.NORMAL,
  };
  return await jwtService.encode(payload);
};

export const makeAuthenticatedRequest = (token: string, version = 1) => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request
    .agent(testApp.getHttpServer())
    .set('Accept', 'application/json')
    .set('os', OS.ANDROID)
    .set('lang', Lang.HIN)
    .set('platform', Platform.APP)
    .set('dialect', Dialect.HAR)
    .set('Authorization', `Bearer ${token}`)
    .set('api-version', version);
};

export const makePlatformPublicRequest = (version = 1) => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request
    .agent(testApp.getHttpServer())
    .set('Accept', 'application/json')
    .set('os', OS.ANDROID)
    .set('lang', Lang.HIN)
    .set('platform', Platform.APP)
    .set('dialect', Dialect.HAR)
    .set('api-version', version);
};

export const makePlatformPublicRequestWithAuth = (
  token: string,
  version = 1,
) => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request
    .agent(testApp.getHttpServer())
    .set('Accept', 'application/json')
    .set('os', OS.ANDROID)
    .set('lang', Lang.HIN)
    .set('platform', Platform.APP)
    .set('dialect', Dialect.HAR)
    .set('Authorization', `Bearer ${token}`)
    .set('api-version', version);
};

export const makePublicRequest = () => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request.agent(testApp.getHttpServer());
};

export const makeAuthenticatedAdminRequest = (token: string) => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request
    .agent(testApp.getHttpServer())
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${token}`);
};

export const makeInternalRequest = () => {
  const testApp = (globalThis as ExtraGlobals).__NEST_APP__;
  if (!testApp) {
    throw new Error(
      'Test app not initialized. Make sure global setup has run.',
    );
  }
  return request
    .agent(testApp.getHttpServer())
    .set('Accept', 'application/json')
    .set('X-Internal-API-Secret', APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET);
};
