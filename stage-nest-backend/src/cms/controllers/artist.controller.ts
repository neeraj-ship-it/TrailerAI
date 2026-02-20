import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  type ArtistDetailsDto,
  type CreateArtistDto,
  type DeleteArtistRequestDto,
  type GenerateArtistImageUploadUrlDto,
  type GenerateImageUploadUrlResponseDto,
  type GetArtistDetailsQueryDto,
  type SearchArtistQueryDto,
} from '../dtos/artist.dto';
import { ArtistService } from '../services/artist.service';
import { Public } from '@app/auth';

@Controller('artist')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Public()
  @TypedRoute.Post('/create')
  async createArtist(
    @TypedBody() artist: CreateArtistDto,
  ): Promise<ArtistDetailsDto> {
    return this.artistService.createArtist(artist);
  }

  @TypedRoute.Delete('/delete')
  async deleteArtist(@TypedBody() body: DeleteArtistRequestDto): Promise<void> {
    await this.artistService.deleteArtist(body.artistId);
  }

  @TypedRoute.Post('/generate-image-upload-url')
  async generateArtistImageUploadUrl(
    @TypedBody() body: GenerateArtistImageUploadUrlDto,
  ): Promise<GenerateImageUploadUrlResponseDto> {
    return this.artistService.generateArtistImageUploadUrl(body);
  }

  @TypedRoute.Get('/details')
  async getArtistDetails(
    @TypedQuery() query: GetArtistDetailsQueryDto,
  ): Promise<ArtistDetailsDto> {
    return this.artistService.getArtistDetails(query.id);
  }

  @TypedRoute.Get('/list')
  async listAllArtists(): Promise<ArtistDetailsDto[]> {
    return this.artistService.listAllArtists();
  }

  @Public()
  @TypedRoute.Get('/migrate')
  async migrateArtistData(): Promise<void> {
    return this.artistService.migrateArtists();
  }

  @Public()
  @TypedRoute.Get('/search')
  async searchArtist(
    @TypedQuery() query: SearchArtistQueryDto,
  ): Promise<ArtistDetailsDto[]> {
    return this.artistService.searchArtist(query.name);
  }

  @Public()
  @TypedRoute.Put('/update')
  async updateArtist(
    @TypedBody() artist: ArtistDetailsDto,
  ): Promise<ArtistDetailsDto> {
    return this.artistService.updateArtist(artist.id, artist);
  }
}
