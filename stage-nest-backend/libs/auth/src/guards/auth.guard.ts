import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { assert } from 'typia';

import { JwtTokenPayloadDto } from '../dto/jwtTokenPayload.dto';
import {
  AuthenticatedRequestHeadersDto,
  InternalAuthRequestHeadersDto,
  RequestHeadersDto,
} from '../dto/requestHeaders.dto';
import { JwtService } from '../services/jwtService';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { DecoratorConstants } from '@app/common/constants/app.constant';
import { ClientAppIdEnum } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class AuthGuard implements CanActivate {
  @Inject(ErrorHandlerService)
  private readonly errorHandlerService!: ErrorHandlerService;

  @Inject(JwtService)
  private readonly jwtService!: JwtService;

  @Inject(Reflector)
  private readonly reflector!: Reflector;

  private async checkValidAuthToken(
    authorizationToken?: string,
  ): Promise<boolean> {
    if (!authorizationToken) return false;

    const tokenParts = authorizationToken.split(' ');

    if (tokenParts.length !== 2 || !tokenParts[1]) return false;
    const token = tokenParts[1];

    const [decodedToken, error] = await this.errorHandlerService.try(async () =>
      this.jwtService.decode(token),
    );

    return !error && decodedToken != null;
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestHeaders = request.headers;

    const hasSkipGlobalAuth = this.reflector.getAllAndOverride<boolean>(
      DecoratorConstants.SkipGlobalAuth,
      [context.getHandler(), context.getClass()],
    );

    if (hasSkipGlobalAuth) {
      return true;
    }

    const shouldSkipGlobalAuth = [
      DecoratorConstants.Public,
      DecoratorConstants.Admin,
      DecoratorConstants.CMS,
      DecoratorConstants.PartnerLogin,
    ].some((decorator) =>
      this.reflector.get<boolean>(decorator, context.getHandler()),
    );

    if (shouldSkipGlobalAuth) {
      return true;
    }

    const isPlatformPublicRoute = this.reflector.get<boolean>(
      DecoratorConstants.PlatformPublic,
      context.getHandler(),
    );

    const isInternalAuth = this.reflector.get<boolean>(
      DecoratorConstants.Internal,
      context.getHandler(),
    );

    if (isInternalAuth) {
      const requestHeaders = assert<InternalAuthRequestHeadersDto>(
        request.headers,
        () => Errors.HEADERS.MISSING_HEADER(`Internal API Secret is required`),
      );
      if (
        requestHeaders['x-internal-api-secret'] !==
        APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET
      ) {
        throw Errors.AUTH.INVALID_CREDENTIALS();
      }
      return true;
    }

    // validate headers when route is public but used internally.
    const isPublicRoutePreferred =
      isPlatformPublicRoute &&
      (!requestHeaders.authorization ||
        !(await this.checkValidAuthToken(requestHeaders.authorization)));

    if (isPublicRoutePreferred) {
      const parsedRequestHeaders = assert<RequestHeadersDto>(
        requestHeaders,
        (err) =>
          Errors.HEADERS.MISSING_HEADER(
            `${err.path?.split('.')[1]} is required`,
          ),
      );
      request.meta = {
        appBuildNumber: parseInt(parsedRequestHeaders['x-app-build'] ?? '0'),
        appId: parsedRequestHeaders.appId ?? ClientAppIdEnum.WEB,
        dialect: parsedRequestHeaders.dialect,
        lang: parsedRequestHeaders.lang,
        os: parsedRequestHeaders.os,
        platform: parsedRequestHeaders.platform,
      };
      return true;
    }

    const parsedAuthRequestHeaders = assert<AuthenticatedRequestHeadersDto>(
      requestHeaders,
      (err) =>
        Errors.HEADERS.MISSING_HEADER(`${err.path?.split('.')[1]} is required`),
    );
    const token = parsedAuthRequestHeaders.authorization.split(' ')[1];

    const decodedToken = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.jwtService.decode(token),
      Errors.AUTH.INVALID_CREDENTIALS(),
    );

    const { profileId, userId } = assert<JwtTokenPayloadDto>(decodedToken);

    request.user = { id: userId, profileId: profileId ?? userId }; // if profileId is not present, use userId for default profile

    request.meta = {
      appBuildNumber: parseInt(parsedAuthRequestHeaders['x-app-build'] ?? '0'),
      appId: parsedAuthRequestHeaders.appId ?? ClientAppIdEnum.WEB,
      dialect: parsedAuthRequestHeaders.dialect,
      lang: parsedAuthRequestHeaders.lang,
      os: parsedAuthRequestHeaders.os,
      platform: parsedAuthRequestHeaders.platform,
    };

    return true;
  }
}
