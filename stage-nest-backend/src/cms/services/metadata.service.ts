import { Injectable } from '@nestjs/common';

import {
  GenreResponseDto,
  MoodResponseDto,
  SubGenreResponseDto,
  ThemeResponseDto,
  ComplianceResponseDto,
  DescriptorTagResponseDto,
} from '../dtos/metadata.dto';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { DescriptorTagRepository } from '../repositories/descriptor-tag.repository';
import { GenreRepository } from '../repositories/genre.repository';
import { MoodRepository } from '../repositories/mood.repository';
import { SubGenreRepository } from '../repositories/subgenre.repository';
import { ThemeRepository } from '../repositories/theme.repository';
@Injectable()
export class MetadataService {
  constructor(
    private readonly subGenreRepository: SubGenreRepository,
    private readonly genreRepository: GenreRepository,
    private readonly themeRepository: ThemeRepository,
    private readonly moodRepository: MoodRepository,
    private readonly complianceRepository: ComplianceRepository,
    private readonly descriptorTagRepository: DescriptorTagRepository,
  ) {}

  async listCompliance(): Promise<ComplianceResponseDto[]> {
    const compliance = await this.complianceRepository.find(
      {
        language: 'en',
      },
      {
        orderBy: { name: 'ASC' },
      },
    );
    return compliance.map((compliance) => ({
      id: compliance._id,
      name: compliance.name,
      status: compliance.status,
    }));
  }

  async listDescriptorTags(): Promise<DescriptorTagResponseDto[]> {
    const descriptorTags = await this.descriptorTagRepository.findAll({
      orderBy: { name: 'ASC' },
    });
    return descriptorTags.map((descriptorTag) => ({
      hinName: descriptorTag.hindiName,
      id: descriptorTag._id,
      name: descriptorTag.name,
      status: descriptorTag.status,
    }));
  }

  async listGenres(): Promise<GenreResponseDto[]> {
    const genres = await this.genreRepository.findAll({
      orderBy: { name: 'ASC' },
    });
    return genres.map((genre) => ({
      hinName: genre.hindiName,
      id: genre._id,
      name: genre.name,
      status: genre.status,
    }));
  }

  async listMoods(): Promise<MoodResponseDto[]> {
    const moods = await this.moodRepository.findAll({
      orderBy: { name: 'ASC' },
    });
    return moods.map((mood) => ({
      hinName: mood.hindiName,
      id: mood._id,
      name: mood.name,
      status: mood.status,
    }));
  }

  async listSubGenres(genreIds: string[]): Promise<SubGenreResponseDto[]> {
    const subGenres = await this.subGenreRepository.find(
      {
        genreId: { $in: genreIds.map((id) => parseInt(id)) },
      },
      {
        orderBy: { name: 'ASC' },
      },
    );
    return subGenres.map((subGenre) => ({
      hinName: subGenre.hinName,
      id: subGenre._id,
      name: subGenre.name,
      status: subGenre.status,
    }));
  }

  async listThemes(): Promise<ThemeResponseDto[]> {
    const themes = await this.themeRepository.findAll({
      orderBy: { name: 'ASC' },
    });
    return themes.map((theme) => ({
      hinName: theme.hindiName,
      id: theme._id,
      name: theme.name,
      status: theme.status,
    }));
  }
}
