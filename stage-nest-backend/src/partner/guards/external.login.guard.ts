import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PartnerLoginSource } from '@app/common/enums/app.enum';

import {
  JioLoginRequestDto,
  StcLoginRequestDto,
} from 'src/partner/dtos/PartnerRequestBody.dto';

import { JioSsoLoginValidation } from '../services/jioSsoLoginValidation';
import { StcLoginValidation } from '../services/stcLoginValidation';
import { Errors, ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class ExternalLoginGuard implements CanActivate {
  @Inject(ErrorHandlerService)
  private readonly errorHandlerService!: ErrorHandlerService;

  @Inject(JioSsoLoginValidation)
  private readonly jioSsoLoginValidation!: JioSsoLoginValidation;

  @Inject(StcLoginValidation)
  private readonly stcLoginValidation!: StcLoginValidation;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const body = request.body as Record<string, unknown>;
    const queryParams = request.query as Record<string, unknown>;
    const authHeader = request.headers.authorization;

    //add check either msisdn or loginSource is present
    if ((!queryParams || !queryParams?.msisdn) && !body) {
      throw Errors.PARTNER.INVALID_REQUEST('Invalid request');
    }

    // Check for STC login (query params with msisdn)
    if (queryParams?.msisdn) {
      // Validate msisdn exists and is non-empty
      const msisdn = this.errorHandlerService.raiseErrorIfNull(
        queryParams.msisdn,
        Errors.PARTNER.INVALID_REQUEST('Missing msisdn parameter'),
      );

      // Validate it's a string and not empty
      if (typeof msisdn !== 'string' || !msisdn.trim()) {
        throw Errors.PARTNER.INVALID_REQUEST('Invalid msisdn parameter');
      }

      const stcLoginRequest = request.query as StcLoginRequestDto;
      const loginData = this.stcLoginValidation.validateRequest(
        stcLoginRequest,
        authHeader,
      );
      // Attach validated data to request for controller to use
      request.body = loginData;
      request.headers['content-type'] = 'application/json';
      return true;
    } else if (body.loginSource === PartnerLoginSource.JIO.toString()) {
      const jioLoginRequest = body as unknown as JioLoginRequestDto;
      return this.jioSsoLoginValidation.validateRequest(jioLoginRequest);
    }
    return false;
  }
}
