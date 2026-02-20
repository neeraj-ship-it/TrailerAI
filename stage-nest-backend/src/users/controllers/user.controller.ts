import { Controller, Headers } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { type IAppUninstallEventDto } from '../dtos/user.dto';
import { UserService } from '../services/user.service';
import { Internal, type ContextUser, CtxUser } from '@app/auth';

import { type UpdateUserCultureRequestDto } from '../dtos/user.request.dto';
import {
  UpdateUserCultureResponseDto,
  CheckDeviceEnvelopeResponseDto,
} from '../dtos/user.response.dto';
import { Public } from '@app/auth';
import { DeleteActionEnum } from 'common/enums/common.enums';
import { TvDetailResponseDto } from 'src/users/dtos/tvDetail.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @TypedRoute.Get('check-device')
  async checkDevice(
    @Headers('deviceid') deviceId: string,
  ): Promise<CheckDeviceEnvelopeResponseDto> {
    return {
      data: await this.userService.getUserByDeviceId(deviceId),
    };
  }
  @TypedRoute.Delete('user-data')
  async deleteUserData(
    @CtxUser() user: ContextUser,
    @TypedBody() body: { actions: DeleteActionEnum[] },
  ): Promise<{ success: boolean; message: string }> {
    await this.userService.deleteUserData(user.id, body.actions);
    return { message: 'User data deleted successfully', success: true };
  }

  @Internal()
  @TypedRoute.Patch('/event/captureUninstall')
  async getUserMeta(
    @TypedBody() body: IAppUninstallEventDto,
  ): Promise<boolean> {
    return this.userService.trackAppUninstall(body);
  }

  @TypedRoute.Get('tvDetail')
  tvDetail(@CtxUser() user: ContextUser): Promise<TvDetailResponseDto> {
    return this.userService.tvDetail(user.id);
  }

  @TypedRoute.Patch('userCulture')
  async updateUserCulture(
    @CtxUser() ctxUser: ContextUser,
    @TypedBody() body: UpdateUserCultureRequestDto,
  ): Promise<UpdateUserCultureResponseDto> {
    return this.userService.updateUserCulture({
      userCulture: body.userCulture,
      userId: ctxUser.id,
    });
  }
}
