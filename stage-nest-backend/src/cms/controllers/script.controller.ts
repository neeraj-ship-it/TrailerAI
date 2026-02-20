import { Controller, Query } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { ScriptService, TaskStatusSummary } from '../services/script.service';
import { Public } from '@app/auth';

@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Public()
  @TypedRoute.Get('check-raw-media-task-status')
  async checkRawMediaTaskStatus(): Promise<TaskStatusSummary> {
    return this.scriptService.checkRawMediaTaskStatus();
  }

  @Public()
  @TypedRoute.Get('trigger-media-convert-for-episode')
  async triggerMediaConvertForEpisode(
    @Query('slug') slug?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    message: string;
    totalEpisodes: number;
    totalEpisodesProcessed: number;
  }> {
    return this.scriptService.triggerMediaConvertForEpisode({
      limit: limit ? parseInt(limit) : undefined,
      slug,
    });
  }

  @Public()
  @TypedRoute.Get('update-content-media-types')
  async updateContentMediaTypes() {
    return this.scriptService.updateContentMediaTypes();
  }
}
