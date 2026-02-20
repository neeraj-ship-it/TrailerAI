import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { assert } from 'typia';

import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';
import { CMSUserService } from 'src/cms/services/cms-user.service';

import {
  InternalAuthRequestHeadersDto,
  RequestHeadersDto,
} from '../dto/requestHeaders.dto';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { DecoratorConstants } from '@app/common/constants/app.constant';
import { Lang, OS, Platform } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class CMSOrAdminGuard implements CanActivate {
  constructor(
    @Inject(CMSUserService)
    private readonly cmsUserService: CMSUserService,

    @Inject(AdminAuthService)
    private readonly adminAuthService: AdminAuthService,

    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,

    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  private checkIsPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.get<boolean>(
      DecoratorConstants.Public,
      context.getHandler(),
    );
  }

  private async tryAdminAuth(
    token: string,
    request: FastifyRequest,
  ): Promise<boolean> {
    const [decodedToken, error] = await this.errorHandlerService.try(() =>
      this.adminAuthService.decode(token),
    );

    if (error || !decodedToken) return false;

    request.token = { token };
    request.user = {
      id: decodedToken.userId,
      profileId: decodedToken.userId,
    };

    return true;
  }

  private async tryCMSAuth(
    token: string,
    request: FastifyRequest,
  ): Promise<boolean> {
    const [decodedToken, decodeError] = await this.errorHandlerService.try(() =>
      this.cmsUserService.decode(token),
    );

    if (decodeError || !decodedToken) return false;

    const [parsedRequestHeaders, headerError] =
      await this.errorHandlerService.try(() =>
        assert<Pick<RequestHeadersDto, 'dialect'>>(request.headers, () =>
          Errors.HEADERS.MISSING_HEADER('dialect is required'),
        ),
      );

    if (headerError || !parsedRequestHeaders) return false;

    request.meta = {
      appId: null,
      dialect: parsedRequestHeaders.dialect,
      lang: Lang.EN,
      os: OS.OTHER,
      platform: Platform.WEB,
    };

    request.token = { token };
    request.user = {
      id: decodedToken.userId,
      profileId: decodedToken.userId,
    };

    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (this.checkIsPublicRoute(context)) {
      return true;
    }

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

    const token = request?.headers?.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const adminAuth = await this.tryAdminAuth(token, request);
    if (adminAuth) {
      return true;
    }

    const cmsAuth = await this.tryCMSAuth(token, request);
    if (cmsAuth) {
      return true;
    }

    throw new UnauthorizedException('Invalid authentication token');
  }
}
