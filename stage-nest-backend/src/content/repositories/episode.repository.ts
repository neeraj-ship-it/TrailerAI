import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Lang } from '@app/common/enums/app.enum';
import { ContentType } from '@app/common/enums/common.enums';
import { HomePageContentType } from '@app/common/interfaces/homepage.interface';
import {
  BaseRepository,
  Fields,
} from '@app/common/repositories/base.repository';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { Episode } from 'src/content/entities/episodes.entity';

export type EpisodeFields = Fields<Episode>;

@Injectable()
export class EpisodesRepository extends BaseRepository<Episode> {
  constructor(
    @InjectModel(Episode.name) private episodesModel: Model<Episode>,
  ) {
    super(episodesModel);
  }

  findActiveEpisodesByShowId(showId: number, projection: EpisodeFields) {
    return this.find({ showId, status: EpisodeStatus.ACTIVE }, projection, {
      lean: true,
      sort: { order: 1 },
    });
  }

  findActiveMovieById(movieId: number, projection: EpisodeFields) {
    return this.findOne(
      {
        _id: movieId,
        status: EpisodeStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      projection,
      {
        cache: { enabled: true },
        lean: true,
      },
    );
  }

  findActiveMovieBySlug(
    { displayLanguage, slug }: { slug: string; displayLanguage: Lang },
    projection: EpisodeFields,
  ) {
    return this.findOne(
      {
        displayLanguage,
        slug,
        status: EpisodeStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      projection,
      {
        cache: { enabled: true },
        lean: true,
      },
    );
  }

  findEpisodesByIdsAndShowId(
    episodeIds: number[],
    showId: number,
    projection: EpisodeFields,
  ) {
    return this.find(
      {
        _id: { $in: episodeIds },
        showId,
      },
      projection,
      {
        lean: true,
      },
    );
  }

  async getMovieInHomePageResponse(displayLanguage: Lang, slug: string) {
    const movie = await this.findOne(
      {
        displayLanguage,
        slug,
        status: EpisodeStatus.ACTIVE,
        type: ContentType.MOVIE,
      },
      [
        '_id',
        'title',
        'language',
        'displayLanguage',
        'thumbnail',
        'releaseDate',
        'selectedPeripheral',
        'genreList',
        'duration',
        'complianceRating',
        'description',
      ],
      {
        cache: { enabled: true },
        lean: true,
      },
    );
    if (!movie) {
      return null;
    }
    return {
      _id: movie._id,
      complianceRating: movie.complianceRating,
      contentType: HomePageContentType.MOVIE,
      description: movie.description,
      duration: movie.duration,
      genreList: movie.genreList,
      releaseDate: movie.releaseDate?.toString() || '',
      selectedPeripheral: movie?.selectedPeripheral,
      slug,
      thumbnail: movie.thumbnail,
      title: movie.title,
    };
  }
}
