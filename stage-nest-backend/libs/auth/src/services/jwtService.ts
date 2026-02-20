import { Injectable, Logger } from '@nestjs/common';
import {
  jwtVerify,
  SignJWT,
  importSPKI,
  decodeProtectedHeader,
  KeyLike,
} from 'jose';
import { assert } from 'typia';

import { JwtTokenPayloadDto } from '../dto/jwtTokenPayload.dto';
import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class JwtService {
  private readonly jwtSecret;

  private readonly logger = new Logger(JwtService.name);

  constructor() {
    this.jwtSecret = new TextEncoder().encode(APP_CONFIGS.PLATFORM.JWT_SECRET);
  }

  async decode(token: string): Promise<JwtTokenPayloadDto | null> {
    if (!token) return null;
    const decoded = await jwtVerify(token, this.jwtSecret);
    const payload = assert<JwtTokenPayloadDto>(decoded.payload);

    if (!payload.profileId) payload.profileId = payload.userId; // support old jwt tokens and set default profile

    return payload;
  }

  async decodeJioToken(token: string, jwtSecret: string): Promise<boolean> {
    try {
      // Let jose parse the header safely
      const { alg } = decodeProtectedHeader(token);

      let key: KeyLike | Uint8Array;

      if (alg === 'HS256') {
        // HMAC secret (plain string/bytes)
        key = new TextEncoder().encode(jwtSecret);
      } else if (alg === 'ES256') {
        // Public key in PEM (SPKI). If stored in .env with \n, fix them:
        const pem = jwtSecret.replace(/\\n/g, '\n').trim();
        key = await importSPKI(pem, 'ES256');
      } else {
        throw new Error(`Unsupported algorithm: ${alg}`);
      }

      // Verify (optionally lock to expected alg)
      const decoded = await jwtVerify(token, key, { algorithms: [alg] });
      if (decoded.payload.userType) {
        return true;
      }
    } catch (error) {
      this.logger.error('Error decoding Jio token', error);
    }
    return false;
  }

  async encode(payload: JwtTokenPayloadDto): Promise<string> {
    const validatedPayload = assert<JwtTokenPayloadDto>(payload);
    return new SignJWT({ ...validatedPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(APP_CONFIGS.PLATFORM.JWT_ACCESS_TOKEN_EXPIRE_TIME)
      .sign(this.jwtSecret);
  }

  async generateNewTokenFromExisting(
    payload: JwtTokenPayloadDto,
  ): Promise<string> {
    const validatedPayload = assert<JwtTokenPayloadDto>(payload);
    if (!validatedPayload.profileId)
      validatedPayload.profileId = validatedPayload.userId; // default to userId for backward compatibility

    return new SignJWT({ ...validatedPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .sign(this.jwtSecret);
  }

  async generateToken(
    payload: JwtTokenPayloadDto,
    jwtSecretKey: string,
    jwtExpireTime: string,
  ): Promise<string> {
    const validatedPayload = assert<JwtTokenPayloadDto>(payload);
    const secret = new TextEncoder().encode(jwtSecretKey);
    return new SignJWT({ ...validatedPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(jwtExpireTime)
      .sign(secret);
  }
}
