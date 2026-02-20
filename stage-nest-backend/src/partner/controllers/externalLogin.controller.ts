import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Inject, UseGuards, HttpCode } from '@nestjs/common';

import type {
  PartnerLoginInterface,
  UserDetailResponse,
} from '../dtos/PartnerRequestBody.dto';
import { PartnerFactory } from '../services/partner.factory';
import { PartnerLogin } from '@app/auth/decorators/PartnerLogin.decorator';
import { ExternalLoginGuard } from 'src/partner/guards/external.login.guard';

@Controller()
@UseGuards(ExternalLoginGuard)
export class ExternalLoginController {
  constructor(@Inject() private readonly partnerFactory: PartnerFactory) {}

  @PartnerLogin()
  @HttpCode(200)
  @TypedRoute.Post('external-login')
  async externalLogin(@TypedBody() body: PartnerLoginInterface) {
    const partnerService = await this.partnerFactory.getPartnerService(body);
    const userDetail = await partnerService.partnerSsoLogin(body);
    const userDetailResponse: UserDetailResponse = {
      accessToken: userDetail.accessToken,
      data: userDetail.data,
      refreshToken: userDetail.refreshToken,
      responseCode: 200,
      responseMessage: 'Success',
    };
    return userDetailResponse;
  }
}
