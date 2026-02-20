import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  MAX_INVITES_PER_USER,
  MAX_PROFILES_PER_USER,
} from '../constants/userProfile.constant';
import {
  CreateUserAccountInviteRequestDto,
  RedirectionScreen,
  SharedUserType,
  UpdateUserAccountInviteRequestDto,
  UserAccountInviteResponseDto,
  UserAccountInviteResponseDtoList,
} from '../dtos/userAccountInvite.dto';
import { UserService } from './user.service';
import { Context } from '@app/auth/decorators/context.decorator';
import { UserAccountInviteRepository } from '@app/common/repositories/userAccountInvite.repository';
import { UserProfileRepository } from '@app/common/repositories/userProfile.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { UserAccountInvite } from 'common/entities/userAccountInvite.entity';
import { ProfileStatus } from 'common/enums/app.enum';

@Injectable()
export class UserAccountInviteService {
  constructor(
    private readonly userAccountInviteRepository: UserAccountInviteRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  private async determineUserTypeAndRedirectionScreen(
    invite: Pick<UserAccountInvite, 'profileDeviceId' | 'userId' | 'profileId'>,
    requestProfileDeviceId?: string,
  ): Promise<{
    redirectionScreen: RedirectionScreen;
    userType: SharedUserType;
  }> {
    // If invite already has profileDeviceId matching request → existing user
    if (
      invite.profileDeviceId &&
      invite.profileDeviceId === requestProfileDeviceId &&
      invite.profileId
    ) {
      return {
        redirectionScreen: RedirectionScreen.PROFILE_SELECTION,
        userType: SharedUserType.EXISTING_DEVICE_USER,
      };
    }

    // Check if profile limit is reached for this user
    const profileCount = await this.userProfileRepository.countDocuments(
      invite.userId,
    );

    if (profileCount >= MAX_PROFILES_PER_USER) {
      return {
        redirectionScreen: RedirectionScreen.PROFILE_SELECTION,
        userType: SharedUserType.ADDITIONAL_PROFILE_USER,
      };
    }

    // No existing profileDeviceId → new device user → profile creation
    return {
      redirectionScreen: RedirectionScreen.PROFILE_CREATION,
      userType: SharedUserType.NEW_DEVICE_USER,
    };
  }

  private toUserAccountInviteResponseDto(
    invite: Pick<
      UserAccountInvite,
      | '_id'
      | 'inviteCountryCode'
      | 'invitePhoneNumber'
      | 'profileDeviceId'
      | 'profileId'
      | 'status'
      | 'userDeviceId'
      | 'userId'
    >,
    countryCode?: string,
    mobileNumber?: string,
    userType?: SharedUserType,
    redirectionScreen?: RedirectionScreen,
  ): UserAccountInviteResponseDto {
    return {
      countryCode,
      inviteCountryCode: invite.inviteCountryCode,
      invitePhoneNumber: invite.invitePhoneNumber,
      linkId: invite._id.toString(),
      mobileNumber,
      profileDeviceId: invite.profileDeviceId,
      profileId: invite.profileId?.toString(),
      redirectionScreen,
      status: invite.status,
      userDeviceId: invite.userDeviceId,
      userId: invite.userId.toString(),
      userType,
    };
  }

  async createUserAccountInvite(
    ctx: Context,
    data: CreateUserAccountInviteRequestDto,
  ): Promise<UserAccountInviteResponseDto> {
    const userAccountInvite = await this.errorHandler.raiseErrorIfNullAsync(
      this.userAccountInviteRepository.create({
        dialect: ctx.meta.dialect,
        inviteCountryCode: data.inviteCountryCode,
        invitePhoneNumber: data.invitePhoneNumber,
        language: ctx.meta.lang,
        status: ProfileStatus.INVITED,
        userDeviceId: data.userDeviceId,
        userId: new Types.ObjectId(ctx.user.id),
      }),
      Errors.USER.USER_ACCOUNT_INVITE_NOT_CREATED(
        'Failed to create user account invite',
      ),
    );

    const { countryCode, mobileNumber } =
      await this.userService.getUserMobileAndCountryCode(ctx.user.id);

    return {
      countryCode,
      inviteCountryCode: data.inviteCountryCode,
      invitePhoneNumber: data.invitePhoneNumber,
      linkId: userAccountInvite._id.toString(),
      mobileNumber,
      status: userAccountInvite.status,
      userDeviceId: userAccountInvite.userDeviceId,
      userId: userAccountInvite.userId.toString(),
    };
  }

  async getUserAccountInvitesByUserId(
    userId: string,
  ): Promise<UserAccountInviteResponseDtoList> {
    const invites = await this.userAccountInviteRepository.find(
      { userId: new Types.ObjectId(userId) },
      [
        '_id',
        'inviteCountryCode',
        'invitePhoneNumber',
        'profileDeviceId',
        'profileId',
        'status',
        'userDeviceId',
        'userId',
      ],
      { lean: true, sort: { _id: -1 } },
    );

    const activeInvites =
      invites?.filter((invite) => invite.status === ProfileStatus.ACTIVE) ?? [];

    const outstandingCount = Math.max(
      0,
      MAX_INVITES_PER_USER - activeInvites.length,
    );

    return {
      data:
        invites?.map((invite) => this.toUserAccountInviteResponseDto(invite)) ??
        [],
      outstandingCount,
      totalActiveCount: activeInvites.length ?? 0,
    };
  }

  async updateUserAccountInvite(
    linkId: string,
    userId: string,
    data: UpdateUserAccountInviteRequestDto,
  ): Promise<UserAccountInviteResponseDto> {
    if (!Types.ObjectId.isValid(linkId)) {
      throw Errors.USER.USER_ACCOUNT_INVITE_NOT_FOUND('Invalid linkId');
    }

    const invite = await this.errorHandler.raiseErrorIfNullAsync(
      this.userAccountInviteRepository.findOne(
        {
          _id: new Types.ObjectId(linkId),
          userId: new Types.ObjectId(userId),
        },
        ['_id', 'userId', 'userDeviceId', 'profileId', 'profileDeviceId'],
        { lean: true },
      ),
      Errors.USER.USER_ACCOUNT_INVITE_NOT_FOUND(
        'User account invite not found',
      ),
    );

    // Determine user type and redirection screen before updating
    const { redirectionScreen, userType } =
      await this.determineUserTypeAndRedirectionScreen(
        invite,
        data.profileDeviceId,
      );

    if (
      invite.profileDeviceId &&
      invite.profileDeviceId !== data.profileDeviceId
    ) {
      throw Errors.USER.USER_ACCOUNT_INVITE_ALREADY_LINKED(
        'Profile already linked to this invite',
      );
    }

    const updatedInvite = await this.errorHandler.raiseErrorIfNullAsync(
      this.userAccountInviteRepository.findByIdAndUpdate(
        linkId,
        {
          $set: {
            profileDeviceId: data.profileDeviceId
              ? data.profileDeviceId
              : undefined,
            profileId: data.profileId
              ? new Types.ObjectId(data.profileId)
              : undefined,
            status: ProfileStatus.ACTIVE,
          },
        },
        { lean: true, new: true },
      ),
      Errors.USER.USER_ACCOUNT_INVITE_NOT_UPDATED(
        'Failed to update user account invite',
      ),
    );

    const { countryCode, mobileNumber } =
      await this.userService.getUserMobileAndCountryCode(userId);

    return this.toUserAccountInviteResponseDto(
      updatedInvite,
      countryCode,
      mobileNumber,
      userType,
      redirectionScreen,
    );
  }

  async updateUserAccountInviteWithProfile(
    linkId: string,
    userId: string,
    profileId: string,
  ): Promise<UserAccountInviteResponseDto> {
    await this.errorHandler.raiseErrorIfNullAsync(
      this.userAccountInviteRepository.findOne(
        {
          _id: new Types.ObjectId(linkId),
          userId: new Types.ObjectId(userId),
        },
        [
          '_id',
          'userId',
          'userDeviceId',
          'profileId',
          'profileDeviceId',
          'status',
        ],
        { lean: true },
      ),
      Errors.USER.USER_ACCOUNT_INVITE_NOT_FOUND(
        'User account invite not found',
      ),
    );

    const updatedInvite = await this.errorHandler.raiseErrorIfNullAsync(
      this.userAccountInviteRepository.findByIdAndUpdate(
        linkId,
        {
          $set: {
            profileId: new Types.ObjectId(profileId),
            status: ProfileStatus.ACTIVE,
          },
        },
        { lean: true, new: true },
      ),
      Errors.USER.USER_ACCOUNT_INVITE_NOT_UPDATED(
        'Failed to update user account invite',
      ),
    );

    const { countryCode, mobileNumber } =
      await this.userService.getUserMobileAndCountryCode(userId);

    return this.toUserAccountInviteResponseDto(
      updatedInvite,
      countryCode,
      mobileNumber,
    );
  }
}
