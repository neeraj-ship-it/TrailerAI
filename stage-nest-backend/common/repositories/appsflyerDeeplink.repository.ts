import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';

import { AppsflyerDeeplink } from '../entities/appsflyerDeeplink.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import {
  BaseRepository,
  Fields,
} from '@app/common/repositories/base.repository';
import { ContentFormat } from 'common/entities/contents.entity';

export type AppsflyerDeeplinkFields = Fields<AppsflyerDeeplink>;
export type AppsflyerDeeplinkDocument = AppsflyerDeeplink & Document;

@Injectable()
export class AppsflyerDeeplinkRepository extends BaseRepository<AppsflyerDeeplink> {
  constructor(
    @InjectModel(AppsflyerDeeplink.name)
    private appsflyerDeeplinkModel: Model<AppsflyerDeeplinkDocument>,
  ) {
    super(appsflyerDeeplinkModel);
  }

  async createOrUpdateDeeplink(
    contentId: number,
    contentType: ContentType,
    slug: string,
    deeplinkData: {
      appsflyerUrl: string;
      deepLinkId: string;
      lastRefreshedAt: Date;
    },
    dialect: Dialect,
    language: Lang,
    format?: ContentFormat,
  ) {
    return this.updateOne({
      filter: { contentId, contentType },
      update: {
        $set: {
          appsflyerUrl: deeplinkData.appsflyerUrl,
          deepLinkId: deeplinkData.deepLinkId,
          format,
          lastRefreshedAt: deeplinkData.lastRefreshedAt,
          slug,
        },
        $setOnInsert: {
          contentId,
          contentType,
          dialect,
          language,
        },
      },
      upsert: true,
    });
  }

  async findByContentAndLocale(
    contentId: number,
    contentType: ContentType,
    projection?: AppsflyerDeeplinkFields,
  ) {
    return this.findOne(
      {
        contentId,
        contentType,
      },
      projection,
      { lean: true },
    );
  }
}
