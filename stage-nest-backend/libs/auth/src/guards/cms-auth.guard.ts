import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { assert, validate } from 'typia';

import { CMSUserService } from 'src/cms/services/cms-user.service';

import { RequestHeadersDto } from '../dto/requestHeaders.dto';
import { CMSRoutesHeaderDto } from '@app/cms/dtos/cmsAuth.dto';
import { DecoratorConstants } from '@app/common/constants/app.constant';
import { Platform } from '@app/common/enums/app.enum';
import { OS } from '@app/common/enums/app.enum';
import { Lang } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class CMSAuthGuard implements CanActivate {
  constructor(
    @Inject(CMSUserService)
    private readonly cmsUserService: CMSUserService,

    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,

    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (this.checkIsPublicRoute(context)) {
      return true;
    }

    if (this.checkIsCMSRoute(context)) {
      this.validateHeaders(request);
      const { decodedToken, token } = await this.getUserPrivileges(request);
      const parsedRequestHeaders = assert<Pick<RequestHeadersDto, 'dialect'>>(
        request.headers,
        (err) =>
          Errors.HEADERS.MISSING_HEADER(
            `${err.path?.split('.')[1]} is required`,
          ),
      );
      request.meta = {
        appId: null,
        dialect: parsedRequestHeaders.dialect,
        lang: Lang.EN,
        os: OS.OTHER,
        platform: Platform.WEB,
      };

      this.setMetaData(token, decodedToken, request);
      return true;
    }
    return true;
  }

  checkIsCMSRoute(context: ExecutionContext): boolean {
    return this.reflector.get<boolean>(
      DecoratorConstants.CMS,
      context.getHandler(),
    );
  }

  checkIsPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.get<boolean>(
      DecoratorConstants.Public,
      context.getHandler(),
    );
  }

  async getUserPrivileges(
    request: FastifyRequest,
  ): Promise<{ decodedToken: { userId: string }; token: string }> {
    const token = request?.headers?.authorization?.split(' ')[1] || '';
    const decodedToken = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.cmsUserService.decode(token),
      Errors.AUTH.INVALID_AUTH_TOKEN(),
    );
    return { decodedToken, token };
  }

  setMetaData(
    token: string,
    decodedToken: { userId: string },
    request: FastifyRequest,
  ) {
    request.token = { token };
    request.user = { id: decodedToken.userId, profileId: decodedToken.userId };
  }

  validateHeaders(request: FastifyRequest) {
    const headerErrors = validate<CMSRoutesHeaderDto>(request.headers);

    if (!headerErrors.success) {
      throw new UnauthorizedException('Missing authorization header');
    }
    if (!request.headers.authorization) {
      throw new UnauthorizedException('Missing authorization header');
    }
  }
}
