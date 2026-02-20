import { Controller } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import {
  type UpdateLikedContentRequestDto,
  type UserProfileResponseDto,
} from '../dto/content-profile.dto';
import { ContentProfileService } from '../services/contentProfile.service';
import { type Context, Ctx } from '@app/auth';

@Controller('content-profile')
export class ContentProfileController {
  constructor(private readonly contentProfileService: ContentProfileService) {}

  @TypedRoute.Get('liked-content')
  async getUserProfile(
    @Ctx() context: Context,
  ): Promise<UserProfileResponseDto> {
    return this.contentProfileService.getUserContentProfile(
      context.user.id,
      context.user.profileId || context.user.id,
    );
  }

  @TypedRoute.Get('watch-list-content')
  async getWatchListContent(@Ctx() context: Context) {
    return this.contentProfileService.getWatchListedContents(
      context.meta.lang,
      context.meta.dialect,
      context.user.id,
    );
  }

  @TypedRoute.Post('remove-like-content')
  async removeLikedContent(
    @Ctx() context: Context,
    @TypedBody() body: UpdateLikedContentRequestDto,
  ) {
    return this.contentProfileService.removeLikedContent(context, body);
  }

  @TypedRoute.Post('like-content')
  async updateLikedContent(
    @Ctx() context: Context,
    @TypedBody() body: UpdateLikedContentRequestDto,
  ) {
    return this.contentProfileService.updateLikedContent(context, body);
  }
}
