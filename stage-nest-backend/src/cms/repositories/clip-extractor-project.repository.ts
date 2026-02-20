import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';

import { ClipExtractorProjectListItemDto } from '../dtos/clip-extractor.dto';
import { ClipExtractorProject } from '../entities/clip-extractor-project.entity';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';

@Injectable()
export class ClipExtractorProjectRepository extends BaseRepository<ClipExtractorProject> {
  constructor(
    @InjectModel(ClipExtractorProject.name)
    private readonly clipExtractorProjectModel: Model<ClipExtractorProject>,
  ) {
    super(clipExtractorProjectModel);
  }

  async createProject(data: {
    projectId: string;
    videoUrl: string;
    contentSlug?: string;
    contentMetadata?: ClipExtractorProject['contentMetadata'];
    narrative?: any;
    clipConfig?: ClipExtractorProject['clipConfig'];
  }): Promise<ClipExtractorProject> {
    return this.create({
      clips: [],
      clipConfig: data.clipConfig,
      contentMetadata: data.contentMetadata,
      contentSlug: data.contentSlug,
      narrative: data.narrative,
      progress: 0,
      projectId: data.projectId,
      startedAt: new Date(),
      status: 'idle',
      videoUrl: data.videoUrl,
    });
  }

  async findAllProjects({
    page = 1,
    perPage = 20,
    search,
    sortOrder = 'desc',
    status,
  }: {
    page?: number;
    perPage?: number;
    search?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
  }): Promise<PaginatedResponseDTO<ClipExtractorProjectListItemDto>> {
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { projectId: { $options: 'i', $regex: search } },
        { 'contentMetadata.title': { $options: 'i', $regex: search } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const items = await this.clipExtractorProjectModel
      .find(filter)
      .select('projectId videoUrl contentMetadata status progress clips createdAt')
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * perPage)
      .limit(perPage + 1)
      .lean();

    const data: ClipExtractorProjectListItemDto[] = items
      .slice(0, perPage)
      .map((item) => ({
        projectId: item.projectId,
        videoUrl: item.videoUrl,
        contentTitle: item.contentMetadata?.title,
        status: item.status,
        progress: item.progress,
        clipsCount: item.clips?.length || 0,
        createdAt: item.createdAt,
      }));

    return {
      data,
      nextPageAvailable: items.length > perPage,
      page,
      perPage,
    };
  }
}
