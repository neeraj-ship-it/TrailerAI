import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ContentOnboardingCategory,
  CategoryStatus,
} from '../entities/contentOnboardingCategory.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { Dialect } from 'common/enums/app.enum';

@Injectable()
export class ContentOnboardingCategoryRepository extends BaseRepository<ContentOnboardingCategory> {
  constructor(
    @InjectModel(ContentOnboardingCategory.name)
    private readonly contentOnboardingCategoryModel: Model<ContentOnboardingCategory>,
  ) {
    super(contentOnboardingCategoryModel);
  }

  async findActiveCategories(
    dialect: Dialect,
  ): Promise<ContentOnboardingCategory[]> {
    const query: { status: CategoryStatus; dialect: Dialect } = {
      dialect,
      status: CategoryStatus.ACTIVE,
    };

    const categories = await this.contentOnboardingCategoryModel
      .find(query)
      .sort({ displayOrder: 1 })
      .exec();

    return categories || [];
  }

  async findById(
    categoryId: number,
  ): Promise<ContentOnboardingCategory | null> {
    return this.contentOnboardingCategoryModel
      .findOne({
        _id: categoryId,
        status: CategoryStatus.ACTIVE,
      })
      .exec();
  }

  async findByIds(categoryIds: number[]): Promise<ContentOnboardingCategory[]> {
    const categories = await this.contentOnboardingCategoryModel
      .find({
        _id: { $in: categoryIds },
        status: CategoryStatus.ACTIVE,
      })
      .sort({ displayOrder: 1 })
      .exec();

    return categories || [];
  }

  async getMaxDisplayOrder(): Promise<number> {
    const result = await this.contentOnboardingCategoryModel
      .findOne({})
      .sort({ displayOrder: -1 })
      .select('displayOrder')
      .exec();

    return result?.displayOrder || 0;
  }

  async searchByName(query: string): Promise<ContentOnboardingCategory[]> {
    const categories = await this.contentOnboardingCategoryModel
      .find({
        $or: [
          { 'categoryName.en': { $options: 'i', $regex: query } },
          { 'categoryName.hin': { $options: 'i', $regex: query } },
        ],
        status: CategoryStatus.ACTIVE,
      })
      .sort({ displayOrder: 1 })
      .exec();

    return categories || [];
  }

  async updateDisplayOrder(
    categoryId: number,
    newOrder: number,
  ): Promise<ContentOnboardingCategory | null> {
    return this.contentOnboardingCategoryModel
      .findByIdAndUpdate(categoryId, { displayOrder: newOrder }, { new: true })
      .exec();
  }
}
