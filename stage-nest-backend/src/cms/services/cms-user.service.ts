import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { randomBytes } from 'crypto';
import { pbkdf2Sync } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { assert } from 'typia';

import {
  CMSUserDetailsDto,
  CMSUserLoginResponseDto,
  CMSUserRegisterDto,
} from '../dtos/cms-user.dto';
import { CMSUserStatusEnum } from '../entities/cms-user.entity';
import { CMSUserRepository } from '../repositories/cms-user.repository';

import {
  JwtTokenPayloadDto,
  TokenType,
} from '@app/auth/dto/jwtTokenPayload.dto';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { ObjectId } from 'mongodb';
@Injectable()
export class CMSUserService {
  private secret;
  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    @Inject(CMSUserRepository)
    private readonly cmsUserRepository: CMSUserRepository,
  ) {
    this.secret = new TextEncoder().encode(APP_CONFIGS.PLATFORM.JWT_SECRET);
  }

  async decode(token: string): Promise<JwtTokenPayloadDto> {
    const decoded = await jwtVerify(token, this.secret);
    const payload = assert<JwtTokenPayloadDto>(decoded.payload);
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

  generateJwtToken(payload: JwtTokenPayloadDto) {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(APP_CONFIGS.PLATFORM.JWT_ACCESS_TOKEN_EXPIRE_TIME)
      .sign(this.secret);
  }

  async getUserDetails(id: string): Promise<CMSUserDetailsDto> {
    const user = await this.cmsUserRepository.findOneOrFail(
      { _id: new ObjectId(id) },
      {
        failHandler: () =>
          Errors.USER.USER_NOT_FOUND('No user is present with this id'),
      },
    );
    return {
      email: user.email,
      firstName: user.firstName,
      id: user.id.toString(),
      lastName: user.lastName,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<CMSUserLoginResponseDto> {
    const user = await this.cmsUserRepository.findOneOrFail(
      { email },
      {
        failHandler: () =>
          Errors.USER.USER_NOT_FOUND('No user is present with this user'),
      },
    );
    const { hashedPassword } = this.generateHashedPassword(
      password,
      await user.salt.load(),
    );
    if ((await user.password_v2.load()) !== hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.generateJwtToken({
      exp: new Date().getTime() + 1000 * 60 * 60 * 24 * 30, // 30 days
      iat: new Date().getTime(),
      rExp: new Date().getTime() + 1000 * 60 * 60 * 24 * 30,
      rId: '',
      type: TokenType.ACCESS,
      userId: user.id.toString(),
    });

    user.lastLogin = new Date();
    return {
      token,
      user: {
        email: user.email,
        firstName: user.firstName,
        id: user.id.toString(),
        lastName: user.lastName,
      },
    };
  }

  async register(payload: CMSUserRegisterDto): Promise<void> {
    const user = await this.cmsUserRepository.findOne({
      email: payload.email,
    });
    if (user) {
      throw new BadRequestException('User already exists');
    }
    const { hashedPassword, salt } = this.generateHashedPassword(
      payload.password,
    );
    const newUser = this.cmsUserRepository.create({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password_v2: hashedPassword,
      roleId: '',
      salt,
      showSubscriptionTab: false,
      status: CMSUserStatusEnum.ACTIVE,
    });
    await this.cmsUserRepository.save(newUser);
  }

  async updatePassword(email: string, newPassword: string): Promise<void> {
    const user = await this.cmsUserRepository.findOneOrFail(
      { email },
      {
        failHandler: () =>
          Errors.USER.USER_NOT_FOUND('No user is present with this email'),
      },
    );

    const { hashedPassword, salt } = this.generateHashedPassword(newPassword);

    user.password_v2.set(hashedPassword);
    user.salt.set(salt);

    await this.cmsUserRepository.upsert(user);
  }

  verifyPassword(password: string, hashedPassword: string, salt: string) {
    const passwordToCompare = this.generateHashedPassword(password, salt);
    return passwordToCompare.hashedPassword === hashedPassword;
  }
}
