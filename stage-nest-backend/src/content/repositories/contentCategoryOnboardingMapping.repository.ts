import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ContentCategoryOnboardingMapping,
  OnboardingContentType,
  OnboardingStatus,
} from '../entities/contentCategoryOnboardingMapping.entity';
import { Dialect } from '@app/common/enums/app.enum';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class ContentCategoryOnboardingMappingRepository extends BaseRepository<ContentCategoryOnboardingMapping> {
  constructor(
    @InjectModel(ContentCategoryOnboardingMapping.name)
    private readonly contentCategoryOnboardingMappingModel: Model<ContentCategoryOnboardingMapping>,
  ) {
    super(contentCategoryOnboardingMappingModel);
  }

  async deleteByCategory(categoryId: number): Promise<void> {
    await this.contentCategoryOnboardingMappingModel
      .deleteMany({ categoryIds: categoryId })
      .exec();
  }

  async deleteByContentSlug(contentSlug: string): Promise<void> {
    await this.contentCategoryOnboardingMappingModel
      .deleteMany({ contentSlug })
      .exec();
  }

  async findByCategories(
    categoryIds: number[],
    dialect: Dialect,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    return this.contentCategoryOnboardingMappingModel
      .find({
        categoryIds: { $in: categoryIds },
        dialect,
        status: OnboardingStatus.ACTIVE,
      })
      .exec();
  }

  async findByCategory(
    categoryId: number,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    const mappings = await this.contentCategoryOnboardingMappingModel
      .find({
        categoryIds: categoryId,
        status: OnboardingStatus.ACTIVE,
      })
      .sort({ priorityOrder: 1 })
      .exec();

    return mappings || [];
  }

  async findByCategoryIdsWithStats(
    categoryIds: number[],
  ): Promise<{ categoryId: number; count: number }[]> {
    return this.contentCategoryOnboardingMappingModel.aggregate([
      {
        $match: {
          categoryIds: { $in: categoryIds },
          status: OnboardingStatus.ACTIVE,
        },
      },
      {
        $unwind: '$categoryIds',
      },
      {
        $match: {
          categoryIds: { $in: categoryIds },
        },
      },
      {
        $group: {
          _id: '$categoryIds',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          count: 1,
        },
      },
    ]);
  }

  async findByContentSlug(
    slug: string,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    const mappings = await this.contentCategoryOnboardingMappingModel
      .find({
        contentSlug: slug,
        status: OnboardingStatus.ACTIVE,
      })
      .sort({ priorityOrder: 1 })
      .exec();

    return mappings || [];
  }

  async findByContentType(
    contentType: OnboardingContentType,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    const mappings = await this.contentCategoryOnboardingMappingModel
      .find({
        contentType,
        status: OnboardingStatus.ACTIVE,
      })
      .sort({ priorityOrder: 1 })
      .exec();

    return mappings || [];
  }

  async findByContentTypeAndCategoryIds(
    contentType: OnboardingContentType,
    categoryIds: number[],
    options: { limit?: number; skip?: number } = {},
  ): Promise<ContentCategoryOnboardingMapping[]> {
    const query = this.contentCategoryOnboardingMappingModel
      .find({
        categoryIds: { $in: categoryIds },
        contentType,
        status: OnboardingStatus.ACTIVE,
      })
      .sort({ priorityOrder: 1 });

    if (options.limit) {
      query.limit(options.limit);
    }
    if (options.skip) {
      query.skip(options.skip);
    }

    return query.exec();
  }

  async findCategoriesForContent(contentSlug: string): Promise<number[]> {
    const mappings = await this.contentCategoryOnboardingMappingModel
      .find({
        contentSlug,
        status: OnboardingStatus.ACTIVE,
      })
      .select('categoryIds')
      .exec();

    const allCategoryIds =
      mappings?.reduce((acc: number[], mapping) => {
        return acc.concat(mapping.categoryIds || []);
      }, []) || [];

    return [...new Set(allCategoryIds)];
  }

  async findContentByCategoryAndType(
    categoryId: number,
    contentType?: OnboardingContentType,
    limit?: number,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    const query: Record<string, unknown> = {
      categoryIds: categoryId,
      status: OnboardingStatus.ACTIVE,
    };

    if (contentType) {
      query.contentType = contentType;
    }

    const queryBuilder = this.contentCategoryOnboardingMappingModel.find(query);
    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.exec();
  }

  async findWithFilters(filters: {
    categoryIds?: number[];
    contentType?: OnboardingContentType;
    status?: OnboardingStatus;
    slug?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'priority' | 'recent';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: ContentCategoryOnboardingMapping[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      query.categoryIds = { $in: filters.categoryIds };
    }

    if (filters.contentType) {
      query.contentType = filters.contentType;
    }

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = OnboardingStatus.ACTIVE;
    }

    if (filters.slug) {
      query.contentSlug = new RegExp(filters.slug, 'i');
    }

    let sort: Record<string, 1 | -1> = { priorityOrder: 1 };
    if (filters.sortBy === 'recent') {
      sort = { updatedAt: filters.sortOrder === 'asc' ? 1 : -1 };
    } else if (filters.sortBy === 'priority') {
      sort = { priorityOrder: filters.sortOrder === 'desc' ? -1 : 1 };
    }

    const total = await this.contentCategoryOnboardingMappingModel
      .countDocuments(query)
      .exec();

    let queryBuilder = this.contentCategoryOnboardingMappingModel
      .find(query)
      .sort(sort);

    if (filters.offset) {
      queryBuilder = queryBuilder.skip(filters.offset);
    }

    if (filters.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    const data = await queryBuilder.exec();

    return {
      data: data || [],
      total,
    };
  }

  async getContentCountByCategory(
    categoryId: number,
    dialect: Dialect,
  ): Promise<number> {
    return this.contentCategoryOnboardingMappingModel
      .countDocuments({
        categoryIds: categoryId,
        dialect,
        status: OnboardingStatus.ACTIVE,
      })
      .exec();
  }

  async getRandomContentForCategories(
    categoryIds: number[],
    limit = 5,
  ): Promise<ContentCategoryOnboardingMapping[]> {
    return this.contentCategoryOnboardingMappingModel.aggregate([
      {
        $match: {
          categoryIds: { $in: categoryIds },
          status: OnboardingStatus.ACTIVE,
        },
      },
      { $sample: { size: limit } },
    ]);
  }

  async updatePriorityOrder(
    id: number,
    newPriorityOrder: number,
  ): Promise<ContentCategoryOnboardingMapping | null> {
    return this.contentCategoryOnboardingMappingModel
      .findByIdAndUpdate(id, { priorityOrder: newPriorityOrder }, { new: true })
      .exec();
  }
}
