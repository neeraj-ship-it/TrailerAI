import { RequireAtLeastOne } from 'type-fest';

import { MovieDto } from './movie.dto';

export interface GetMovieDetailsResponseDto {
  movie: MovieDto & {
    contentDetailsCtaText: string;
    lapsedPercent: number;
    shareCopies: string;
    likeStatus: string | null;
    restartPlayback: boolean;
    shareLink?: string;
  };
}

export interface GetMovieWatchProgressResponseDto {
  watchProgress: {
    watchProgressPercentage: number;
  } | null;
}

export type GetAllMoviesResponseDto = Omit<
  Pick<MovieDto, '_id' | 'slug' | 'thumbnail' | 'title'>,
  'title'
> & {
  title: RequireAtLeastOne<{ en?: string; hin?: string }, 'en' | 'hin'>;
};
