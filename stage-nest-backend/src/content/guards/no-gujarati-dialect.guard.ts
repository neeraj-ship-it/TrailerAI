import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { Dialect } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class NoGujaratiDialectGuard implements CanActivate {
  @Inject(ErrorHandlerService)
  private readonly errorHandler!: ErrorHandlerService;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const dialect = request.meta?.dialect;

    this.errorHandler.raiseErrorIfFalse(
      dialect !== Dialect.GUJ,
      Errors.CONTENT.ONBOARDING.INVALID_DIALECT(
        'Gujarati dialect is not supported for onboarding',
      ),
    );

    return true;
  }
}
