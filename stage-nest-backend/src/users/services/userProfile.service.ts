import { BadRequestException, Injectable } from '@nestjs/common';

import { ObjectId } from 'mongodb';

import { FastifyRequest } from 'fastify';

import { RmNumbersService } from '../../shared/services/rmNumbers.service';
import { MAX_PROFILES_PER_USER } from '../constants/userProfile.constant';
import {
  CreateUserProfileRequestDto,
  SwitchProfileResponseDto,
  UpdateUserProfileRequestDto,
  UserProfileDto,
} from '../dtos/userProfile.dto';
import { UserAccountInviteService } from './userAccountInvite.service';
import { JwtService } from '@app/auth';
import { Fields } from '@app/common/repositories/base.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserProfileRepository } from '@app/common/repositories/userProfile.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { defaultProfileAvatar } from 'common/constants/app.constant';
import { UserProfile } from 'common/entities/userProfile.entity';
import { Dialect, Lang, ProfileStatus } from 'common/enums/app.enum';
import { generateRandomDisplayName } from 'common/helpers/profile.helper';

type UserProfileFields = Fields<UserProfile>;

@Injectable()
export class UserProfileService {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    private readonly userRepository: UserRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly jwtService: JwtService,
    private readonly userAccountInviteService: UserAccountInviteService,
    private readonly rmNumbersService: RmNumbersService,
  ) {}

  private async createDefaultProfile(
    user: string,
    profileId: string,
    dialect: Dialect,
  ): Promise<UserProfile[]> {
    const userId = new ObjectId(user);

    // Check if profile already exists FIRST (before fetching user data)
    const existingDefaultProfile = await this.userProfileRepository.findOne({
      _id: userId,
      isPrimaryProfile: true,
      user: userId,
    });

    // Branch B: Profile exists and was modified - return directly, skip getUserData()
    if (
      existingDefaultProfile &&
      existingDefaultProfile.createdAt.getTime() !==
        existingDefaultProfile.updatedAt.getTime()
    ) {
      const allProfiles = await this.userProfileRepository.find({
        status: ProfileStatus.ACTIVE,
        user: userId,
      });
      return allProfiles as UserProfile[];
    }

    // Only fetch user data if we need it (Branch A or C)
    const userData = await this.getUserData(userId);

    // Branch A: Profile exists but never modified - update with user data
    //todo for if culture is selected then we need to call update on client after culture selection
    if (existingDefaultProfile) {
      await this.userProfileRepository.findByIdAndUpdate(
        profileId,
        {
          $set: {
            avatar: defaultProfileAvatar[dialect],
            contentCulture: dialect,
            displayName:
              userData?.displayName || generateRandomDisplayName(dialect),
            fullName: userData?.fullName,
            language: userData?.language || Lang.HIN,
            status: ProfileStatus.ACTIVE,
            user: userId,
          },
        },
        { lean: true, new: true },
      );

      const updatedProfiles = await this.userProfileRepository.find({
        status: ProfileStatus.ACTIVE,
        user: userId,
      });
      return updatedProfiles as UserProfile[];
    }

    // Branch C: Create new profile if none exists
    const defaultProfile = await this.userProfileRepository.create({
      _id: userId,
      avatar: defaultProfileAvatar[dialect], //todo: due to users table the content which is primaryLanguage is string
      contentCulture: dialect,
      displayName: userData?.displayName || generateRandomDisplayName(dialect),
      fullName: userData?.fullName,
      isPrimaryProfile: true,
      language: userData?.language || Lang.HIN,
      status: ProfileStatus.ACTIVE,
      user: userId,
    });

    return [defaultProfile];
  }

  private async getUserData(userId: ObjectId): Promise<{
    displayName?: string;
    fullName?: string;
    contentCulture: string;
    language: string;
  }> {
    const user = this.errorHandler.raiseErrorIfNull(
      await this.userRepository.findById(userId.toString()),
      Errors.USER.USER_NOT_FOUND(),
    );

    return {
      contentCulture: user.primaryLanguage || Dialect.HAR,
      displayName: user.userName,
      fullName: user.userName,
      language: user.language || Lang.HIN,
    };
  }

  private async toUserProfileResponseDto(
    profile: UserProfile,
  ): Promise<UserProfileDto> {
    return {
      age: profile.age,
      avatar: profile.avatar,
      contentCulture: profile.contentCulture,
      displayName: profile.displayName,
      fullName: profile.fullName,
      gender: profile.gender,
      isPrimaryProfile: profile.isPrimaryProfile,
      language: profile.language,
      latitude: profile.geoLocation?.coordinates[1],
      longitude: profile.geoLocation?.coordinates[0],
      profileId: profile._id.toString(),
      status: profile.status,
      user: profile.user.toString(),
      whatsappSupportNumber: await this.rmNumbersService.getRmNumberForUser(
        profile.user.toString(),
      ),
    };
  }

  async createProfile(
    payload: CreateUserProfileRequestDto,
    user: string,
  ): Promise<UserProfileDto> {
    const existingProfiles = await this.userProfileRepository.countDocuments(
      new ObjectId(user),
    );
    if (existingProfiles === null || existingProfiles === undefined) {
      throw Errors.USER.USER_PROFILE_NOT_CREATED(
        'Unable to count existing profiles',
      );
    }
    if (existingProfiles >= MAX_PROFILES_PER_USER) {
      throw Errors.USER.MAX_PROFILES_REACHED(MAX_PROFILES_PER_USER);
    }

    const isPrimaryProfile = existingProfiles === 0;
    const userId = new ObjectId(user);
    const birthYear = payload.age
      ? new Date().getFullYear() - payload.age
      : undefined;

    const profile = await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.create({
        ...payload,
        _id: isPrimaryProfile ? userId : undefined, // if primary profile, _id will be userId else it will be created by mongoose
        geoLocation:
          payload.longitude && payload.latitude
            ? {
                coordinates: [payload.longitude, payload.latitude],
                type: 'Point',
              }
            : undefined,
        isPrimaryProfile,
        status: ProfileStatus.ACTIVE,
        user: userId,
        yearOfBirth: birthYear,
      }),
      Errors.USER.USER_PROFILE_NOT_CREATED(),
    );

    if (payload.linkId) {
      await this.userAccountInviteService.updateUserAccountInviteWithProfile(
        payload.linkId,
        user.toString(),
        profile._id.toString(),
      );
    }

    return this.toUserProfileResponseDto(profile);
  }

  async delete(id: string, user: string): Promise<void> {
    const profile = await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.findOne({
        _id: new ObjectId(id),
        user: new ObjectId(user),
      }),
      Errors.USER.USER_PROFILE_NOT_FOUND(),
    );

    if (profile.isPrimaryProfile) {
      throw new BadRequestException('Primary profile cannot be deleted');
    }
    await this.userProfileRepository.softDelete(id);
  }

  async deleteUserWatchlist(userId: string): Promise<void> {
    await this.userProfileRepository.deleteUserWatchlist(userId);
  }

  async getProfileById(
    profileId: string,
    user: string,
  ): Promise<UserProfileDto> {
    const profile = await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.findOne(
        {
          _id: new ObjectId(profileId),
          status: ProfileStatus.ACTIVE,
          user: new ObjectId(user),
        },
        undefined,
        { lean: true },
      ),
      Errors.USER.USER_PROFILE_NOT_FOUND(),
    );
    return this.toUserProfileResponseDto(profile);
  }

  async getProfiles(
    user: string,
    profileId: string,
    dialect: Dialect,
  ): Promise<UserProfileDto[]> {
    const defaultProfile = await this.createDefaultProfile(
      user,
      profileId,
      dialect,
    );
    return Promise.all(
      defaultProfile.map((profile) => this.toUserProfileResponseDto(profile)),
    );
  }

  async isSlugInWatchlist(
    userId: string | undefined,
    profileId: string | undefined,
    slug: string,
  ): Promise<boolean> {
    if (!userId || !profileId) {
      return false;
    }
    const profiles = await this.userProfileRepository.find({
      _id: new ObjectId(profileId),
      user: new ObjectId(userId),
      'watchListContent.slug': slug,
    });
    return (profiles?.length ?? 0) > 0;
  }

  async switchProfile(
    profileId: string,
    user: string,
    req: FastifyRequest,
  ): Promise<SwitchProfileResponseDto> {
    const jwtToken = this.errorHandler.raiseErrorIfNull(
      req.headers['authorization']?.split(' ')[1],
      Errors.AUTH.INVALID_CREDENTIALS(),
    );

    const decodedToken = await this.errorHandler.raiseErrorIfNullAsync(
      this.jwtService.decode(jwtToken),
      Errors.AUTH.INVALID_CREDENTIALS(),
    );

    const profile = await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.findOne(
        {
          _id: new ObjectId(profileId),
          status: ProfileStatus.ACTIVE,
          user: new ObjectId(user),
        },
        [
          '_id',
          'age',
          'avatar',
          'contentCulture',
          'displayName',
          'fullName',
          'gender',
          'isPrimaryProfile',
          'language',
          'geoLocation',
          'status',
          'user',
        ] as UserProfileFields,
        { lean: true },
      ),
      Errors.USER.USER_PROFILE_NOT_FOUND(),
    );

    const newProfileToken = await this.jwtService.generateNewTokenFromExisting({
      ...decodedToken,
      profileId: profileId,
    });

    const profileDto = await this.toUserProfileResponseDto(profile);
    return { token: `Bearer ${newProfileToken}`, userProfile: profileDto };
  }

  async updateProfile(
    profileId: string,
    payload: UpdateUserProfileRequestDto,
    user: string,
  ): Promise<UserProfileDto> {
    await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.find({
        _id: new ObjectId(profileId),
        user: new ObjectId(user),
      }),
      Errors.USER.USER_PROFILE_NOT_FOUND(),
    );
    const updatedProfile = await this.errorHandler.raiseErrorIfNullAsync(
      this.userProfileRepository.findByIdAndUpdate(
        profileId,
        { $set: payload },
        { lean: true, new: true },
      ),
      Errors.USER.USER_PROFILE_NOT_UPDATED(),
    );

    return this.toUserProfileResponseDto(updatedProfile);
  }
}
