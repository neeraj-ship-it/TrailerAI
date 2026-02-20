import { Inject, Injectable } from '@nestjs/common';

import { PartnerLoginSource, LoginType } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

import {
  StcRequest,
  StcLoginRequestDto,
} from 'src/partner/dtos/PartnerRequestBody.dto';

@Injectable()
export class StcLoginValidation {
  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}
  private validateBasicAuth(authHeader?: string): boolean {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    return true;
  }

  public validateRequest(
    stcLoginRequest: StcLoginRequestDto,
    authHeader?: string,
  ): StcRequest {
    if (!this.validateBasicAuth(authHeader)) {
      throw Errors.AUTH.INVALID_AUTH_TOKEN();
    }

    const mobileNumber = stcLoginRequest.msisdn;

    // Map query params to StcLoginRequestDto
    const loginData: StcRequest = {
      action: stcLoginRequest.action,
      amount: stcLoginRequest.pricePointCharged,
      channel: stcLoginRequest.channel,
      circle: stcLoginRequest.circle,
      endDate: stcLoginRequest.endDate,
      loginSource: PartnerLoginSource.STC,
      mobileNumber: mobileNumber,
      operator: stcLoginRequest.operator,
      packName: stcLoginRequest.packName,
      param1: stcLoginRequest.param1,
      stageLoginType: LoginType.AUTH,
      startDate: stcLoginRequest.startDate,
      transactionId: stcLoginRequest.transactionId,
      userStatus: stcLoginRequest.userStatus,
      vendorName: stcLoginRequest.vendorName,
    };
    return loginData;
  }
}
