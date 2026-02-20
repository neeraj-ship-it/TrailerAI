import { Inject, Injectable } from '@nestjs/common';

import { Types } from 'mongoose';

import { UserSpecialStatesRepository } from '../../content/repositories/userSpecialStates.repository';
import { OnboardingService } from '../../content/services/onboarding.service';
import { TvDetailResponseDto } from '../dtos/tvDetail.dto';
import { IAppUninstallEventDto } from '../dtos/user.dto';
import { CheckDeviceResponseDto } from '../dtos/user.response.dto';
import { UpdateUserCultureResponseDto } from '../dtos/user.response.dto';
import { UserDeviceRecordService } from './userDeviceRecord.service';
import { UserProfileService } from './userProfile.service';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { OS } from '@app/common/enums/app.enum';
import {
  DeleteActionEnum,
  EnvironmentEnum,
} from '@app/common/enums/common.enums';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserCulturesRepository } from '@app/common/repositories/userCulture.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';
import { Events } from '@app/events/interfaces/events.interface';
import { TvDetailRepository } from '@app/shared/repositories/tvDetail.repository';
@Injectable()
export class UserService {
  constructor(
    @Inject() private userRepository: UserRepository,
    @Inject() private errorHandler: ErrorHandlerService,
    @Inject() private eventsService: EventService,
    @Inject() private userCultureRepository: UserCulturesRepository,
    @Inject() private tvDetailRepository: TvDetailRepository,
    @Inject() private userProfileService: UserProfileService,
    @Inject() private userOnboardingService: OnboardingService,
    @Inject() private userDeviceRecordService: UserDeviceRecordService,
    @Inject() private userSpecialStatesRepository: UserSpecialStatesRepository,
  ) {}

  async deleteUserData(
    userId: string,
    actions: DeleteActionEnum[],
  ): Promise<void> {
    if (APP_CONFIGS.ENV === EnvironmentEnum.PRODUCTION) {
      throw Errors.ENVIRONMENT.NOT_ALLOWED();
    }
    if (actions.length === 0) {
      throw Errors.USER.USER_DATA_NOT_FOUND();
    }

    // Validate actions
    const allowedActions = Object.values(DeleteActionEnum);
    for (const action of actions) {
      if (!allowedActions.includes(action as DeleteActionEnum)) {
        throw Errors.USER.USER_DATA_NOT_FOUND(`Invalid action: ${action}`);
      }
    }

    // Run deletions concurrently
    await Promise.all(
      actions.map((action) => {
        switch (action) {
          case DeleteActionEnum.WATCHLIST:
            return this.userProfileService.deleteUserWatchlist(userId);
          case DeleteActionEnum.ONBOARDING_STATE:
            return this.userOnboardingService.deleteUserOnboardingState(userId);
          case DeleteActionEnum.ONBOARDING_PREFERENCE:
            return this.userOnboardingService.deleteUserOnboardingPreference(
              userId,
            );
          case DeleteActionEnum.USER_SPECIAL_ACCESS_STATES:
            return this.userSpecialStatesRepository.deleteUserSpecialAccessStates(
              userId,
            );
          default:
            return Promise.resolve();
        }
      }),
    );
  }

  async getUserByDeviceId(deviceId: string): Promise<CheckDeviceResponseDto> {
    if (deviceId.trim().length === 0) {
      throw Errors.DEVICE.DEVICE_NOT_FOUND();
    }
    const userDevice =
      await this.userDeviceRecordService.checkUserDeviceRecord(deviceId);

    return {
      countryCode: userDevice.countryCode,
      primaryMobileNumber: userDevice.primaryMobileNumber,
    };
  }

  async getUserMobileAndCountryCode(userId: string): Promise<{
    mobileNumber: string;
    countryCode?: string;
  }> {
    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findById(new Types.ObjectId(userId), [
        'primaryMobileNumber',
        'countryCode',
      ]),
      Errors.USER.USER_NOT_FOUND(),
    );

    return {
      countryCode: user.countryCode,
      mobileNumber: user.primaryMobileNumber,
    };
  }

  async trackAppUninstall(payload: IAppUninstallEventDto): Promise<boolean> {
    const userDetails = payload.user;
    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findOne(
        { _id: new Types.ObjectId(userDetails.userId) },
        ['_id', 'uninstalledStatus'],
      ),
      Errors.USER.USER_NOT_FOUND(),
    );

    await this.userRepository.updateOne({
      filter: { _id: user._id },
      update: { uninstalledStatus: true },
    });

    this.eventsService.trackEvent({
      app_client_id: payload.user.appInfo.appId,
      key: Events.APP_UNINSTALL,
      os: OS.ANDROID,
      payload,
      user_id: user._id.toString(),
    });

    return true;
  }

  async tvDetail(userId: string): Promise<TvDetailResponseDto> {
    const tvDetail = await this.tvDetailRepository.findOne(
      { userId },
      {
        fields: ['createdAt', 'tvDeviceId'],
      },
    );

    return {
      ...tvDetail,
      adopted: tvDetail === null ? false : true,
      deviceId: tvDetail?.tvDeviceId,
    };
  }

  async updateUserCulture({
    userCulture,
    userId,
  }: {
    userId: string;
    userCulture: string;
  }): Promise<UpdateUserCultureResponseDto> {
    const userCultureData = await this.errorHandler.raiseErrorIfNullAsync(
      this.userCultureRepository.findActiveUserCultureByAbbreviation(
        userCulture,
      ),
      Errors.SETTING.USER_CULTURES_NOT_FOUND(),
    );
    return this.userRepository.updateUserCulture({
      userCulture: userCultureData.abbreviation,
      userId,
    });
  }
}
