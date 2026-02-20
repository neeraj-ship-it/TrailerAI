import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { privilegesEnum } from '../../admin/adminUser/enums/privileges.enum';
import { Admin, AdminUserGuard } from '@app/auth';
import type { PaginatedResponseDTO } from 'common/dtos/paginated.response.dto';

import type {
  CreatePosterProjectRequestDto,
  GetPosterProjectByIdResponseDto,
  PosterProjectResponseDto,
  PosterProjectStatusResponseDto,
  UpdatePosterProjectRequestDto,
} from '../dtos/poster-project.dto';
import { PosterProjectService } from '../services/poster-project.service';

interface GetAllPosterProjectsQuery {
  page?: number;
  perPage?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string;
}

interface GetPosterProjectByIdQuery {
  imageSource?: 'legacy' | 's3';
  promptId?: string;
}

@UseGuards(AdminUserGuard)
@Controller('posters/projects')
export class PosterProjectController {
  constructor(private readonly posterProjectService: PosterProjectService) {}

  @TypedRoute.Post()
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.POSTER_GENERATOR_ALL)
  async createPosterProject(
    @TypedBody() body: CreatePosterProjectRequestDto,
  ): Promise<PosterProjectResponseDto> {
    return this.posterProjectService.create(body);
  }

  @TypedRoute.Get()
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.POSTER_GENERATOR_ALL)
  async getAllPosterProjects(
    @TypedQuery() query: GetAllPosterProjectsQuery,
  ): Promise<PaginatedResponseDTO<PosterProjectResponseDto>> {
    const { page = 1, perPage = 20, search, sortOrder = 'desc', tags } = query;
    const tagsArray = tags
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    return this.posterProjectService.findAll({
      page,
      perPage,
      search,
      sortOrder,
      tags: tagsArray,
    });
  }

  @TypedRoute.Get(':id')
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.POSTER_GENERATOR_ALL)
  async getPosterProjectById(
    @TypedParam('id') id: string,
    @TypedQuery() query: GetPosterProjectByIdQuery,
  ): Promise<GetPosterProjectByIdResponseDto> {
    const { imageSource = 'legacy', promptId } = query;
    return this.posterProjectService.findById(id, imageSource, promptId);
  }

  @TypedRoute.Get(':id/status')
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.POSTER_GENERATOR_ALL)
  async getProjectStatus(
    @TypedParam('id') id: string,
  ): Promise<PosterProjectStatusResponseDto> {
    return this.posterProjectService.getStatus(id);
  }

  @TypedRoute.Patch(':id')
  @Admin(privilegesEnum.FULL_ACCESS, privilegesEnum.POSTER_GENERATOR_ALL)
  async updatePosterProject(
    @TypedParam('id') id: string,
    @TypedBody() body: UpdatePosterProjectRequestDto,
  ): Promise<PosterProjectResponseDto> {
    return this.posterProjectService.update(id, body);
  }
}
