import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';

import { PosterProjectResponseDto } from '../dtos/poster-project.dto';
import {
  FrameExtractionStatus,
  PosterGenerationStatus,
  PosterProject,
  PosterProjectStatus,
} from '../entities/poster-project.entity';

const DEFAULT_STATUS: PosterProjectStatus = {
  frames: FrameExtractionStatus.IDLE,
  poster: PosterGenerationStatus.IDLE,
};

// Helper to ensure status has all required fields with valid enum values
const normalizeStatus = (
  status: Partial<PosterProjectStatus> | undefined | null,
): PosterProjectStatus => ({
  frames: status?.frames ?? DEFAULT_STATUS.frames,
  poster: status?.poster ?? DEFAULT_STATUS.poster,
});

@Injectable()
export class PosterProjectRepository extends BaseRepository<PosterProject> {
  constructor(
    @InjectModel(PosterProject.name)
    private readonly posterProjectModel: Model<PosterProject>,
  ) {
    super(posterProjectModel);
  }

  async createProject(data: {
    name: string;
    contentSlug?: string;
    rawMediaId?: string;
    tags?: string[];
  }): Promise<PosterProjectResponseDto> {
    const doc = await this.create({
      contentSlug: data.contentSlug,
      name: data.name,
      rawMediaId: data.rawMediaId
        ? new Types.ObjectId(data.rawMediaId)
        : undefined,
      status: DEFAULT_STATUS,
      tags: data.tags ?? [],
    });
    const plain = await this.posterProjectModel.findById(doc._id).lean();
    if (!plain) {
      throw new Error('Failed to retrieve created document');
    }
    return {
      _id: plain._id.toString(),
      contentSlug: plain.contentSlug,
      createdAt: plain.createdAt,
      name: plain.name,
      rawMediaId: plain.rawMediaId?.toString(),
      status: normalizeStatus(plain.status),
      tags: plain.tags ?? [],
      updatedAt: plain.updatedAt,
    };
  }

  async findAllProjects({
    page = 1,
    perPage = 20,
    search,
    sortOrder = 'desc',
    tags,
  }: {
    page?: number;
    perPage?: number;
    search?: string;
    sortOrder?: 'asc' | 'desc';
    tags?: string[];
  }) {
    const filter: Record<string, unknown> = {};

    // Search by name (case-insensitive)
    if (search) {
      filter.name = { $options: 'i', $regex: search };
    }

    // Filter by tags (match any)
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    const items = await this.posterProjectModel
      .find(filter)
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * perPage)
      .limit(perPage + 1)
      .lean();

    return {
      data: items.slice(0, perPage).map((doc) => ({
        _id: doc._id.toString(),
        contentSlug: doc.contentSlug,
        createdAt: doc.createdAt,
        name: doc.name,
        rawMediaId: doc.rawMediaId?.toString(),
        status: normalizeStatus(doc.status),
        tags: doc.tags ?? [],
        updatedAt: doc.updatedAt,
      })),
      pagination: {
        nextPageAvailable: items.length > perPage,
        page,
        perPage,
      },
    };
  }

  async findProjectById(id: string): Promise<PosterProjectResponseDto | null> {
    const doc = await this.posterProjectModel.findById(id).lean();
    if (!doc) return null;
    return {
      _id: doc._id.toString(),
      contentSlug: doc.contentSlug,
      createdAt: doc.createdAt,
      name: doc.name,
      rawMediaId: doc.rawMediaId?.toString(),
      status: normalizeStatus(doc.status),
      tags: doc.tags ?? [],
      updatedAt: doc.updatedAt,
    };
  }

  async updateFrameStatus(
    id: string,
    frameStatus: FrameExtractionStatus,
  ): Promise<void> {
    await this.posterProjectModel.findByIdAndUpdate(id, {
      'status.frames': frameStatus,
    });
  }

  async updatePosterStatus(
    id: string,
    posterStatus: PosterGenerationStatus,
  ): Promise<void> {
    await this.posterProjectModel.findByIdAndUpdate(id, {
      'status.poster': posterStatus,
    });
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      contentSlug?: string;
      rawMediaId?: string;
      tags?: string[];
    },
  ): Promise<PosterProjectResponseDto | null> {
    const update: Record<string, unknown> = {};

    if (data.name !== undefined) {
      update.name = data.name;
    }
    if (data.contentSlug !== undefined) {
      update.contentSlug = data.contentSlug;
    }
    if (data.rawMediaId !== undefined) {
      update.rawMediaId = new Types.ObjectId(data.rawMediaId);
    }
    if (data.tags !== undefined) {
      update.tags = data.tags;
    }

    const doc = await this.posterProjectModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean();

    if (!doc) return null;
    return {
      _id: doc._id.toString(),
      contentSlug: doc.contentSlug,
      createdAt: doc.createdAt,
      name: doc.name,
      rawMediaId: doc.rawMediaId?.toString(),
      status: normalizeStatus(doc.status),
      tags: doc.tags ?? [],
      updatedAt: doc.updatedAt,
    };
  }
}
