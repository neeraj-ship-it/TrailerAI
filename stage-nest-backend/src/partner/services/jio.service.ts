import { Injectable, Inject } from '@nestjs/common';

import { randomUUID } from 'crypto';

import {
  PartnerLoginInterface,
  UserDetailDTO,
  UserDetail,
  DataUser,
} from '../dtos/PartnerRequestBody.dto';
import { IPartnerService } from './interfaces/IPartnerService';
import { TokenType } from '@app/auth/dto/jwtTokenPayload.dto';
import { JwtService } from '@app/auth/services/jwtService';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { PartnerLoginSource } from '@app/common/enums/app.enum';
import { UserRepository } from '@app/common/repositories/user.repository';
import { parsedEnv } from '@app/common/utils/env.utils';
import { UserSubscriptionUtil } from '@app/common/utils/userSubscription.util';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class JioService implements IPartnerService {
  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(UserSubscriptionUtil)
    private readonly userSubscriptionUtil: UserSubscriptionUtil,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  getLoginSource(): PartnerLoginSource {
    return PartnerLoginSource.JIO;
  }

  async partnerSsoLogin(body: PartnerLoginInterface): Promise<UserDetailDTO> {
    const userData = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findUserByEmailOrMobile({
        primaryMobileNumber: body.mobileNumber,
      }),
      Errors.USER.USER_NOT_FOUND(),
    );

    let rExp = Math.floor(
      (Date.now() + APP_CONFIGS.PARTNER.TEN_DAYS_IN_MILI_SECONDS) / 1000,
    );

    const accessToken = await this.jwtService.generateToken(
      {
        exp: rExp,
        iat: Math.floor(Date.now() / 1000),
        rExp: rExp,
        rId: randomUUID(),
        type: TokenType.ACCESS,
        userId: userData._id.toString(),
      },
      parsedEnv.JWT_ACCESS_TOKEN_SECRET_KEY,
      APP_CONFIGS.PARTNER.JIO_JWT_EXPIRE_TIME,
    );

    rExp = Math.floor(
      (Date.now() + APP_CONFIGS.PARTNER.TEN_DAYS_IN_MILI_SECONDS) / 1000,
    );

    const refreshToken = await this.jwtService.generateToken(
      {
        exp: rExp,
        iat: Math.floor(Date.now() / 1000),
        rExp: rExp,
        rId: randomUUID(),
        type: TokenType.REFRESH,
        userId: userData._id.toString(),
      },
      parsedEnv.JWT_REFRESH_TOKEN_SECRET_KEY,
      APP_CONFIGS.PARTNER.JIO_JWT_EXPIRE_TIME,
    );

    const userSubscription =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.userSubscriptionUtil.checkIfUserIsSubscribed(
          userData._id.toString(),
        ),
        Errors.USER_SUBSCRIPTION.NOT_FOUND(),
      );
    const userDetails: UserDetail = {
      _id: userData._id.toString(),
      subscriptionStatus: userSubscription ? 1 : 0,
    };
    const dataUser: DataUser = {
      userDetail: userDetails,
    };

    const userDetailResponse = {
      accessToken: accessToken,
      data: dataUser,
      refreshToken: refreshToken,
    };

    return userDetailResponse;
  }
}
