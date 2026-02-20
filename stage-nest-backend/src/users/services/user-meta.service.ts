import { Inject, Injectable } from '@nestjs/common';

import {
  UpdateUserMetaRequestDto,
  UpdateUserMetaResponseDto,
} from '../dtos/update-meta.dto';
import { UserMeta } from '@app/common/entities/user-meta.entity';
import { UserMetaRepository } from '@app/common/repositories/user-meta.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class UserMetaService {
  constructor(
    @Inject() private userMetaRepository: UserMetaRepository,
    @Inject() private errorHandler: ErrorHandlerService,
  ) {}

  // TODO: this will be a high frequency fetch operation, think for caching logic for this
  async fetchUserMeta({ userId }: { userId: string }): Promise<UserMeta> {
    return this.errorHandler.raiseErrorIfNullAsync(
      this.userMetaRepository.findOne(
        {
          user: userId,
        },
        undefined,
        { lean: true },
      ),
      Errors.USER.USER_META_NOT_FOUND(),
    );
  }

  async updateUserMeta({
    data,
    userId,
  }: {
    userId: string;
    data: UpdateUserMetaRequestDto;
  }): Promise<UpdateUserMetaResponseDto> {
    await this.errorHandler.raiseErrorIfNullAsync(
      this.userMetaRepository.updateOne({
        filter: {
          user: userId,
        },
        update: { $set: { ...data } },
        upsert: true,
      }),
      Errors.USER.USER_META_UPDATE_FAIL(),
    );

    return {
      description: 'successfully updated the user meta!',
      success: true,
    };
  }
}
