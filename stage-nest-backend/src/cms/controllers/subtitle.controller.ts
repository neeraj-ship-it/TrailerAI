import { Controller } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

import { SubtitleResponseDTO } from '../dtos/content.dto';
import { MediaSubtitleService } from '../services/media-subtitle.service';
import { Public } from '@app/auth';

@Controller('subtitle')
export class SubtitleController {
  constructor(private readonly mediaSubtitleService: MediaSubtitleService) {}

  @Public()
  @TypedRoute.Post('/auto-generate')
  async generateSubtitles(@TypedBody() body: { slug: string }) {
    return this.mediaSubtitleService.generateSubtitlesForContent(body);
  }

  @Public()
  @TypedRoute.Get('/status/:slug')
  async getSubtitleStatus(
    @TypedParam('slug') slug: string,
  ): Promise<SubtitleResponseDTO> {
    return this.mediaSubtitleService.getSubtitleStatus(slug);
  }
}
