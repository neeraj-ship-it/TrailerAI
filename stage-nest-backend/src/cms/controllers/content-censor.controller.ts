import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { ContentSensorItem } from '../dtos/content-sensor.dto';
import { ContentCensorService } from '../services/content-censor.service';
import { Public } from '@app/auth';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

@Controller('content-censor')
export class ContentCensorController {
  constructor(private readonly contentCensorService: ContentCensorService) {}

  @Public()
  @TypedRoute.Post(':contentSlug/add-audience')
  async addUsersToSensorList(
    @TypedParam('contentSlug') contentSlug: string,
    @TypedBody()
    body: { users: string[]; dialect: Dialect; type: ContentTypeV2 },
  ): Promise<void> {
    await this.contentCensorService.addUsersToPreviewContent({
      contentSlug,
      dialect: body.dialect,
      type: body.type,
      users: body.users,
    });
  }

  @Public()
  @TypedRoute.Get(':contentSlug/export-audience')
  async exportAudienceList(
    @TypedParam('contentSlug') contentSlug: string,
    @TypedQuery() query: { dialect: Dialect; type: ContentTypeV2 },
  ) {
    return this.contentCensorService.generateAudienceList(
      contentSlug,
      query.dialect,
      query.type,
    );
  }

  @Public()
  @TypedRoute.Get('list-contents/:dialect')
  async listContentsInPreviewMode(
    @TypedParam('dialect') dialect: Dialect,
  ): Promise<ContentSensorItem[]> {
    return await this.contentCensorService.listContentsSlugsInPreviewMode(
      dialect,
    );
  }
}
