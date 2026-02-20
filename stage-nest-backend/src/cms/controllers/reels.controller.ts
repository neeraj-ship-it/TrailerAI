import { Controller } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

import type {
  CreateOrUpdateReelRequestDto,
  ReelResponseDto,
} from '../dtos/reels.dto';
import { ReelService } from '../services/reel.service';
import { ReelStatusEnum } from '@app/common/entities/reel.entity';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reelService: ReelService) {}

  @TypedRoute.Post()
  async createOrUpdateReel(@TypedBody() body: CreateOrUpdateReelRequestDto) {
    return this.reelService.createOrUpdateReel(body);
  }

  @TypedRoute.Delete('/:reelId')
  async deleteReel(@TypedParam('reelId') reelId: string) {
    await this.reelService.deleteReel(reelId);
  }

  @TypedRoute.Get('/list/:contentSlug')
  async getContentReels(
    @TypedParam('contentSlug') contentSlug: string,
  ): Promise<ReelResponseDto[]> {
    return this.reelService.listAllReelsForContent({ contentSlug });
  }

  @TypedRoute.Post('/:reelId/toggle-publish')
  async toggleReelPublishStatus(
    @TypedParam('reelId') reelId: string,
  ): Promise<{ status: ReelStatusEnum }> {
    const res = await this.reelService.toggleReelPublishStatus(reelId);
    return { status: res.status };
  }
}
