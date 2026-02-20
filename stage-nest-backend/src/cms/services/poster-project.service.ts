import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  GetPosterProjectByIdResponseDto,
  PosterProjectResponseDto,
  PosterProjectStatusResponseDto,
  PromptGenerationDto,
} from '../dtos/poster-project.dto';
import { UserPromptInput } from '../entities/prompt.entity';
import { PosterProjectRepository } from '../repositories/poster-project.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { RawMediaRepository } from '../repositories/raw-media.repository';
import { FileManagerService } from './file-manager.service';
import { Errors } from '@app/error-handler';
import { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';
import { SourceTypeEnum } from 'common/entities/raw-media.entity';

export type ImageSourceType = 'legacy' | 's3';

interface CreatePosterProjectData {
  contentSlug?: string;
  name: string;
  rawMediaId?: string;
  tags?: string[];
}

interface UpdatePosterProjectData {
  contentSlug?: string;
  name?: string;
  rawMediaId?: string;
  tags?: string[];
}

@Injectable()
export class PosterProjectService {
  constructor(
    private readonly posterProjectRepository: PosterProjectRepository,
    private readonly promptRepository: PromptRepository,
    private readonly rawMediaRepository: RawMediaRepository,
    private readonly fileManagerService: FileManagerService,
  ) {}

  private async getPromptGenerations(
    projectId: string,
    promptId?: string,
  ): Promise<PromptGenerationDto[]> {
    if (promptId) {
      // Fetch single prompt with its images
      const prompt = await this.promptRepository.findPromptById(promptId);
      if (!prompt) {
        return [];
      }

      const images = await this.fileManagerService.listGeneratedPosters(
        projectId,
        promptId,
      );

      return [
        {
          images,
          prompt: {
            _id: prompt._id,
            createdAt: prompt.createdAt,
            userInput: prompt.userInput,
            version: prompt.version,
          },
        },
      ];
    }

    // Fetch all prompts for this project with their images
    const prompts = await this.promptRepository.findByProjectId(projectId);

    const promptGenerations = await Promise.all(
      prompts.map(async (prompt) => {
        const images = await this.fileManagerService.listGeneratedPosters(
          projectId,
          prompt._id,
        );

        return {
          images,
          prompt: {
            _id: prompt._id,
            createdAt: prompt.createdAt,
            userInput: prompt.userInput,
            version: prompt.version,
          },
        };
      }),
    );

    return promptGenerations;
  }

  async create(
    data: CreatePosterProjectData,
  ): Promise<PosterProjectResponseDto> {
    return this.posterProjectRepository.createProject(data);
  }

  async createPrompt(
    projectId: string,
    userInput: UserPromptInput,
  ): Promise<{ _id: string; version: number }> {
    const prompt = await this.promptRepository.createPrompt(
      projectId,
      userInput,
    );
    return {
      _id: prompt._id,
      version: prompt.version,
    };
  }

  async findAll({
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
  }): Promise<PaginatedResponseDTO<PosterProjectResponseDto>> {
    const result = await this.posterProjectRepository.findAllProjects({
      page,
      perPage,
      search,
      sortOrder,
      tags,
    });
    return {
      data: result.data,
      nextPageAvailable: result.pagination.nextPageAvailable,
      page: result.pagination.page,
      perPage: result.pagination.perPage,
    };
  }

  async findById(
    id: string,
    imageSource: ImageSourceType = 'legacy',
    promptId?: string,
  ): Promise<GetPosterProjectByIdResponseDto> {
    const posterProject =
      await this.posterProjectRepository.findProjectById(id);

    if (!posterProject) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND('Poster project not found');
    }

    // List frames from S3 using projectId
    const extractedFrames =
      await this.fileManagerService.listExtractedFrames(id);

    // Dual-path logic based on imageSource
    if (imageSource === 's3') {
      // New S3-based fetch with prompt grouping
      const promptGenerations = await this.getPromptGenerations(id, promptId);

      return {
        extractedFrames,
        posterProject,
        posters: [],
        promptGenerations,
      };
    }

    // Legacy: raw-media query
    const rawMediaId = posterProject.rawMediaId
      ? new Types.ObjectId(posterProject.rawMediaId)
      : undefined;

    const posters = rawMediaId
      ? await this.rawMediaRepository.find({
          parentRawMediaId: rawMediaId,
          source: {
            type: SourceTypeEnum.AI_GENERATED,
          },
        })
      : [];

    const parsedPosters = (posters ?? []).map((poster) => ({
      rawMediaId: poster._id.toString(),
      url: poster.source.url ?? '',
    }));

    return {
      extractedFrames,
      posterProject,
      posters: parsedPosters,
    };
  }

  async getPromptsByProject(projectId: string) {
    return this.promptRepository.findByProjectId(projectId);
  }

  async getStatus(projectId: string): Promise<PosterProjectStatusResponseDto> {
    const project =
      await this.posterProjectRepository.findProjectById(projectId);
    if (!project) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND('Poster project not found');
    }
    return {
      projectId: project._id,
      status: project.status,
    };
  }

  async update(
    id: string,
    data: UpdatePosterProjectData,
  ): Promise<PosterProjectResponseDto> {
    const updated = await this.posterProjectRepository.updateProject(id, data);
    if (!updated) {
      throw Errors.CMS.POSTER_PROJECT.NOT_FOUND('Poster project not found');
    }
    return updated;
  }
}
