import { Inject, Injectable, Logger } from '@nestjs/common';
import typia, { IValidation } from 'typia';

import { JwtService } from '../../../libs/auth/src/services/jwtService';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { parsedEnv } from 'common/utils/env.utils';
import { JioLoginRequestDto } from 'src/partner/dtos/PartnerRequestBody.dto';

@Injectable()
export class JioSsoLoginValidation {
  // todo: make generic interface and make this implement it.

  @Inject(ErrorHandlerService)
  private readonly errorHandlerService!: ErrorHandlerService;
  private readonly logger = new Logger(JioSsoLoginValidation.name);

  constructor(private readonly jwtService: JwtService) {}

  public async validateRequest(body: JioLoginRequestDto) {
    body.mobileNumber = body.mobileNumber.replace('+91', '');
    const validationResult: IValidation<JioLoginRequestDto> =
      typia.validate<JioLoginRequestDto>(body);

    if (!validationResult.success) {
      const failureResult = validationResult;
      const errorMessages = (failureResult.errors || [])
        .map(
          (error) =>
            `Property '${error.path}' failed validation: ${error.expected}`,
        )
        .join('; ');

      throw Errors.PARTNER.INVALID_LOGIN_REQUEST(errorMessages);
    } else {
      const loginType = body.loginType;
      if (loginType !== '3') {
        //validate jwt token
        const publicKey = parsedEnv.JIO_PUBLIC_KEY;
        this.logger.error('jio public sso token: ' + body.ssoToken);
        const isValid = await this.jwtService.decodeJioToken(
          body.ssoToken,
          publicKey,
        );
        if (!isValid) {
          this.logger.warn('JioLogin validation failed: ssoToken is invalid');
          throw Errors.AUTH.INVALID_CREDENTIALS();
        }
      }
    }

    const jioLoginDto = validationResult.data;
    if (!jioLoginDto.ssoToken) {
      this.logger.warn('JioLogin validation failed: ssoToken is required');
      throw Errors.AUTH.INVALID_CREDENTIALS();
    }
    return true;
  }
}
