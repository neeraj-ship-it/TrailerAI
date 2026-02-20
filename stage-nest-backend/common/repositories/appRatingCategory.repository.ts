import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppRatingCategory } from '../entities/appRatingCategory.entity';
import { Lang, Dialect } from '../enums/app.enum';
import { BaseRepository } from './base.repository';

export class AppRatingCategoryRepository extends BaseRepository<AppRatingCategory> {
  constructor(
    @InjectModel(AppRatingCategory.name)
    private readonly appRatingCategoryModel: Model<AppRatingCategory>,
  ) {
    super(appRatingCategoryModel);
  }

  async createOrUpdate(
    filter: { categoryId: string; dialect: Dialect; language: Lang },
    data: Partial<AppRatingCategory>,
  ): Promise<AppRatingCategory> {
    return this.appRatingCategoryModel
      .findOneAndUpdate(filter, { $set: data }, { new: true, upsert: true })
      .exec();
  }

  async findByLanguageAndDialect(
    language: Lang,
    dialect: Dialect,
  ): Promise<AppRatingCategory[]> {
    return this.appRatingCategoryModel.find({ dialect, language }).exec();
  }
}
