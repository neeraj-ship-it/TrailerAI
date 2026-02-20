import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  type CreateShortlinkRequestDto,
  type CreateShortlinkResponseDto,
} from '../dto/appsflyer.dto';
import { DeepLinkService } from '../services/appsflyer.service';

@Controller('deeplink')
export class DeepLinkController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @TypedRoute.Post('generate-sharelink')
  async createShortlink(
    @TypedBody() body: CreateShortlinkRequestDto,
  ): Promise<CreateShortlinkResponseDto> {
    return this.deepLinkService.createShortlink(body);
  }
}
