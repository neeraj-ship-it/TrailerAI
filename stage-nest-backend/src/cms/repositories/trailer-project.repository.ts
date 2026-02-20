import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';

import { TrailerProjectListItemDto } from '../dtos/trailer.dto';
import { TrailerProject } from '../entities/trailer-project.entity';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';

@Injectable()
export class TrailerProjectRepository extends BaseRepository<TrailerProject> {
  constructor(
    @InjectModel(TrailerProject.name)
    private readonly trailerProjectModel: Model<TrailerProject>,
  ) {
    super(trailerProjectModel);
  }

  async createProject(data: {
    projectId: string;
    rawMediaId?: string;
    contentSlug?: string;
    contentMetadata?: TrailerProject['contentMetadata'];
  }): Promise<TrailerProject> {
    return this.create({
      contentMetadata: data.contentMetadata,
      contentSlug: data.contentSlug,
      projectId: data.projectId,
      rawMediaId: data.rawMediaId
        ? new Types.ObjectId(data.rawMediaId)
        : undefined,
      startedAt: new Date(),
      variantIds: [],
    });
  }

  async findAllProjects({
    contentSlug,
    page = 1,
    perPage = 20,
    search,
    sortOrder = 'desc',
  }: {
    page?: number;
    perPage?: number;
    search?: string;
    sortOrder?: 'asc' | 'desc';
    contentSlug?: string;
  }): Promise<PaginatedResponseDTO<TrailerProjectListItemDto>> {
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.projectId = { $options: 'i', $regex: search };
    }

    if (contentSlug) {
      filter.contentSlug = contentSlug;
    }

    const items = await this.trailerProjectModel
      .find(filter)
      .select('projectId')
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * perPage)
      .limit(perPage + 1)
      .lean();

    return {
      data: items.slice(0, perPage),
      nextPageAvailable: items.length > perPage,
      page,
      perPage,
    };
  }
}
