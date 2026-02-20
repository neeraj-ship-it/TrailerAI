import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { validate } from 'typia';

import { AdminAuthService } from 'src/admin/adminUser/services/adminAuth.service';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { DecoratorConstants } from '@app/common/constants/app.constant';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { AdminRoutesHeaderDto } from 'src/admin/adminUser/dtos/adminRoutesHeader.dto';

@Injectable()
export class AdminUserGuard implements CanActivate {
  constructor(
    @Inject(AdminAuthService)
    private readonly adminAuthService: AdminAuthService,

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

    const isInternalAuth = this.reflector.get<boolean>(
      DecoratorConstants.Internal,
      context.getHandler(),
    );

    // Try internal auth if header is present
    if (isInternalAuth) {
      const internalSecret = request.headers['x-internal-api-secret'] as string;
      if (internalSecret) {
        if (internalSecret === APP_CONFIGS.PLATFORM.INTER_SERVICE_SECRET) {
          return true;
        }
        // Invalid secret provided
        throw Errors.AUTH.INVALID_CREDENTIALS();
      }
      // No internal secret provided, fall through to admin auth
    }

    if (this.checkIsAdminRoute(context)) {
      this.validateHeaders(request);
      const { decodedToken, token, userPrivileges } =
        await this.getUserPrivileges(request);
      const requiredPrivileges = this.reflector.getAllAndOverride<string[]>(
        DecoratorConstants.Privileges,
        [context.getHandler(), context.getClass()],
      );

      if (!this.hasPrivilege(requiredPrivileges, userPrivileges)) {
        throw new ForbiddenException(
          'User does not have the required privileges.',
        );
      }
      this.setMetaData(token, decodedToken, request);
      return true;
    }
    return false;
  }

  checkIsAdminRoute(context: ExecutionContext): boolean {
    return this.reflector.get<boolean>(
      DecoratorConstants.Admin,
      context.getHandler(),
    );
  }

  checkIsPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.get<boolean>(
      DecoratorConstants.Public,
      context.getHandler(),
    );
  }

  async getUserPrivileges(request: FastifyRequest) {
    const token = request?.headers?.authorization?.split(' ')[1] || '';
    const decodedToken = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.adminAuthService.decode(token),
      Errors.AUTH.INVALID_AUTH_TOKEN(),
    );
    return { decodedToken, token, userPrivileges: decodedToken.privileges };
  }

  hasPrivilege(requiredPrivileges: string[] = [], userPrivileges: string[]) {
    return requiredPrivileges.some((requiredPrivilege) =>
      userPrivileges.includes(requiredPrivilege),
    );
  }

  setMetaData(
    token: string,
    decodedToken: { userId: string },
    request: FastifyRequest,
  ) {
    request.token = { token };
    request.user = {
      id: decodedToken.userId,
      profileId: decodedToken.userId,
    };
  }

  validateHeaders(request: FastifyRequest) {
    const headerErrors = validate<AdminRoutesHeaderDto>(request.headers);

    if (!headerErrors.success) {
      throw new UnauthorizedException('Missing authorization header');
    }
    if (!request.headers.authorization) {
      throw new UnauthorizedException('Missing authorization header');
    }
  }
}
