import { TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import type {
  GetMovieDetailsRequestDto,
  GetMovieWatchProgressRequestDto,
} from '../dto/movieController.request.dto';
import type {
  GetAllMoviesResponseDto,
  GetMovieDetailsResponseDto,
  GetMovieWatchProgressResponseDto,
} from '../dto/movieController.response.dto';
import { MovieService } from '../services/movies.service';
import {
  type Context,
  Ctx,
  CtxPlatformPublic,
  type PlatformPublicContext,
  PlatformPublic,
} from '@app/auth';
import { type PaginatedRequestDTO } from '@app/common/dtos/paginated.request.dto';
import { type PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @TypedRoute.Get('all')
  @PlatformPublic()
  async getAllMovieDetails(
    @TypedQuery() query: PaginatedRequestDTO,
    @Ctx() ctx: Context,
  ): Promise<PaginatedResponseDTO<GetAllMoviesResponseDto>> {
    return this.movieService.getAllMovies(query, ctx);
  }

  @TypedRoute.Get('details')
  @PlatformPublic()
  async getMovieDetails(
    @TypedQuery() query: GetMovieDetailsRequestDto,
    @CtxPlatformPublic() ctx: PlatformPublicContext,
  ): Promise<GetMovieDetailsResponseDto> {
    return this.movieService.fetchMovieDetails(query, ctx);
  }
  // Deprecated on 04-02-2025
  @TypedRoute.Get('watchProgress')
  async getWatchProgress(
    @TypedQuery() query: GetMovieWatchProgressRequestDto,
    @Ctx() ctx: Context,
  ): Promise<GetMovieWatchProgressResponseDto> {
    return this.movieService.getMovieWatchProgress(query, ctx);
  }
}
