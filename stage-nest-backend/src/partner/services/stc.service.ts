import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  PartnerLoginInterface,
  UserDetailDTO,
} from '../dtos/PartnerRequestBody.dto';
import { InternalExpressService } from './internal.express.service';
import { PartnerLoginSource } from '@app/common/enums/app.enum';
import { UserRepository } from '@app/common/repositories/user.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { parsedEnv } from 'common/utils/env.utils';
import { IPartnerService } from 'src/partner/services/interfaces/IPartnerService';

@Injectable()
export class StcService implements IPartnerService {
  private readonly logger = new Logger(StcService.name);

  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(InternalExpressService)
    private readonly internalService: InternalExpressService,
  ) {}

  getLoginSource(): PartnerLoginSource {
    return PartnerLoginSource.STC;
  }
  async partnerSsoLogin(body: PartnerLoginInterface): Promise<UserDetailDTO> {
    const response = await this.internalService.subscribeUserToPartner(
      body.mobileNumber,
      parsedEnv.STC_PARTNER_ID,
      parsedEnv.STAGE_BASE_URL,
      parsedEnv.STC_JWT_SCRET_KEY,
      parsedEnv.STC_PLAN_ID,
    );
    if (response.data.subscriptionStatus !== 'success') {
      this.logger.error('User not subscribed to partner');
      throw Errors.USER.USER_NOT_SUBSCRIBED();
    }
    const userData = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findUserByEmailOrMobile({
        primaryMobileNumber: body.mobileNumber,
      }),
      Errors.USER.USER_NOT_FOUND(),
    );
    const userDetailResponse: UserDetailDTO = {
      accessToken: null,
      data: userData,
      refreshToken: null,
    };
    return userDetailResponse;
  }
}
