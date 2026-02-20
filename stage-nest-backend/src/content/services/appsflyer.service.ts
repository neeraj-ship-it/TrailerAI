import { Injectable } from '@nestjs/common';

import { CreateShortlinkRequestDto } from '../dto/appsflyer.dto';
import { AppsflyerDeeplinkRepository } from '@app/common/repositories/appsflyerDeeplink.repository';
import { ShortlinkResponse } from 'common/dtos/appsflyer.dto';
import { AppsFlyerUtils } from 'common/utils/appsflyer.utils';

@Injectable()
export class DeepLinkService {
  constructor(
    private readonly appsflyerDeeplinkRepository: AppsflyerDeeplinkRepository,
    private readonly appsFlyerUtils: AppsFlyerUtils,
  ) {}

  async createShortlink(
    data: CreateShortlinkRequestDto,
  ): Promise<ShortlinkResponse> {
    return this.appsFlyerUtils.createShortlink({
      af_og_description: data.af_og_description,
      af_og_image: data.af_og_image,
      af_og_title: data.af_og_title,
      campaign: '',
      deepLinkValue: data.deepLinkValue,
    });
  }
}
