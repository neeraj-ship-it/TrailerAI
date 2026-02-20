import { Controller } from '@nestjs/common';

import { MetadataService } from '../services/metadata.service';

import { TypedQuery, TypedRoute } from '@nestia/core';

import {
  GenreResponseDto,
  MoodResponseDto,
  SubGenreResponseDto,
  ThemeResponseDto,
  ComplianceResponseDto,
  DescriptorTagResponseDto,
} from '../dtos/metadata.dto';
import { Public } from '@app/auth/decorators/public.decorator';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @TypedRoute.Get('compliance')
  @Public()
  async getCompliance(): Promise<ComplianceResponseDto[]> {
    return this.metadataService.listCompliance();
  }

  @TypedRoute.Get('descriptor-tags')
  @Public()
  async getDescriptorTags(): Promise<DescriptorTagResponseDto[]> {
    return this.metadataService.listDescriptorTags();
  }

  @TypedRoute.Get('genres')
  @Public()
  async getGenres(): Promise<GenreResponseDto[]> {
    return this.metadataService.listGenres();
  }

  @TypedRoute.Get('moods')
  @Public()
  async getMoods(): Promise<MoodResponseDto[]> {
    return this.metadataService.listMoods();
  }

  @TypedRoute.Get('sub-genres')
  @Public()
  async getSubGenres(
    @TypedQuery() query: { genreIds: string },
  ): Promise<SubGenreResponseDto[]> {
    return this.metadataService.listSubGenres(query.genreIds.split(','));
  }

  @TypedRoute.Get('themes')
  @Public()
  async getThemes(): Promise<ThemeResponseDto[]> {
    return this.metadataService.listThemes();
  }
}
