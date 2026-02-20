import { Inject, Injectable } from '@nestjs/common';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

import { assert } from 'typia';

import { IJwtPayload } from '../interface/jwtPayload.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
@Injectable()
export class AdminAuthService {
  private secret;
  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
  ) {
    this.secret = new TextEncoder().encode(APP_CONFIGS.PLATFORM.JWT_SECRET);
  }

  async decode(token: string): Promise<IJwtPayload> {
    const decoded = await jwtVerify(token, this.secret);
    const payload = assert<IJwtPayload>(decoded.payload);
    await this.errorHandlerService.raiseErrorIfNull(
      payload,
      Errors.AUTH.INVALID_AUTH_TOKEN(),
    );
    return payload;
  }

  generateHashedPassword(password: string, salt?: string) {
    const saltToUse = salt || randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, saltToUse, 1000, 64, 'sha256').toString(
      'hex',
    );
    return {
      hashedPassword: hash,
      salt: saltToUse,
    };
  }

  generateJwtToken(payload: IJwtPayload) {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(APP_CONFIGS.PLATFORM.JWT_ACCESS_TOKEN_EXPIRE_TIME)
      .sign(this.secret);
  }

  verifyPassword(password: string, hashedPassword: string, salt: string) {
    const passwordToCompare = this.generateHashedPassword(password, salt);
    return passwordToCompare.hashedPassword === hashedPassword;
  }
}
