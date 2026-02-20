import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, Version } from '@nestjs/common';

import type { GetShowDetailsRequestDto } from '../dto/getShowDetails.request.dto';
import type {
  GetShowDetailsResponseDTO,
  GetShowDetailsWithProgressResponseDTO,
} from '../dto/getShowDetails.response.dto';
import {
  ToggleMicroDramaLikeResponseDto,
  type ToggleMicroDramaLikeRequestDto,
} from '../dto/microDrama.dto';
import { ShowsService } from '../services/shows.services';
import {
  CtxPlatformPublic,
  type PlatformPublicContext,
  PlatformPublic,
  type ContextUser,
  CtxUser,
} from '@app/auth';

@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @Version('1')
  @TypedRoute.Get('details')
  @PlatformPublic()
  async getShowDetails(
    @TypedQuery() query: GetShowDetailsRequestDto,
    @CtxPlatformPublic() ctx: PlatformPublicContext,
  ): Promise<GetShowDetailsResponseDTO> {
    return this.showsService.getShowDetails({
      ctx,
      showId: query.showId,
    });
  }

  @Version('2')
  @TypedRoute.Get('details')
  @PlatformPublic()
  async getShowDetailsV2(
    @TypedQuery() query: GetShowDetailsRequestDto,
    @CtxPlatformPublic() ctx: PlatformPublicContext,
  ): Promise<GetShowDetailsWithProgressResponseDTO> {
    return this.showsService.getShowDetailsByPlatform({
      ctx,
      endEpisodeNumber: query.endEpisodeNumber,
      seasonId: query.seasonId,
      showId: query.showId,
      startEpisodeNumber: query.startEpisodeNumber,
    });
  }

  @TypedRoute.Patch('micro-drama-interaction')
  async toggleMicroDramaLike(
    @CtxUser() user: ContextUser,
    @TypedBody() body: ToggleMicroDramaLikeRequestDto,
  ): Promise<ToggleMicroDramaLikeResponseDto> {
    return this.showsService.toggleMicroDramaLike(
      user.id,
      user?.profileId || user.id,
      body,
    );
  }
}
