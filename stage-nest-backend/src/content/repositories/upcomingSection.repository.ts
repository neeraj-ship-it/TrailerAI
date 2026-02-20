import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UpcomingSection } from '../entities/upcomingSection.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { BaseRepository, Fields } from 'common/repositories/base.repository';

type UpcomingSectionFields = Fields<UpcomingSection>;
@Injectable()
export class UpcomingSectionRepository extends BaseRepository<UpcomingSection> {
  constructor(
    @InjectModel(UpcomingSection.name)
    private upcomingSectionModel: Model<UpcomingSection>,
  ) {
    super(upcomingSectionModel);
  }
  findUpcomingSectionMediaData(
    {
      currentDate,
      dialect,
      lang,
    }: {
      lang: Lang;
      dialect: Dialect;
      currentDate: Date;
    },
    projections: UpcomingSectionFields,
  ) {
    return this.find(
      {
        contentType: { $in: ['show', 'individual'] },
        displayLanguage: lang,
        displayMedia: 'media',
        isLived: true,
        language: dialect,
        releaseDate: {
          $gte: new Date(currentDate),
        },
      },
      projections,
      { lean: true, sort: { releaseDate: 1 } },
    );
  }

  findUpcomingSectionPosterData(
    {
      currentDate,
      dialect,
      lang,
    }: {
      lang: Lang;
      dialect: Dialect;
      currentDate: Date;
    },
    projections: UpcomingSectionFields,
  ) {
    return this.find(
      {
        contentType: { $in: ['show', 'individual'] },
        displayLanguage: lang,
        displayMedia: 'poster',
        isLived: true,
        language: dialect,
        releaseDate: {
          $gte: new Date(currentDate),
        },
      },
      projections,
      { lean: true, sort: { posterReleaseDate: 1 } },
    );
  }
}
