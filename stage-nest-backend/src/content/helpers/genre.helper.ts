import { ContentTypeGenreList } from '../dto/getGenreWiseData.request.dto';
import { Episode } from '../entities/episodes.entity';
import { Show } from '../entities/show.entity';
import { Peripheral } from '../schemas/peripheral.schema';
import { ContentType } from '@app/common/enums/common.enums';
import { ContentFormat } from 'common/entities/contents.entity';

interface EpisodeDto
  extends Pick<
    Episode,
    | '_id'
    | 'title'
    | 'thumbnail'
    | 'genreList'
    | 'slug'
    | 'duration'
    | 'complianceRating'
    | 'description'
  > {
  contentType: ContentType;
  selectedPeripheral?: Peripheral;
}

interface ShowDto
  extends Pick<
    Show,
    | '_id'
    | 'title'
    | 'thumbnail'
    | 'genreList'
    | 'slug'
    | 'duration'
    | 'complianceRating'
    | 'description'
  > {
  contentType: ContentType;
  selectedPeripheral?: Peripheral;
}
export interface ContentByGenre {
  genreId: number;
  genreName: string;
  microdramas: (EpisodeDto | ShowDto)[];
  movies: (EpisodeDto | ShowDto)[];
  shows: (EpisodeDto | ShowDto)[];
}

interface AddContentToGenreList {
  contents: (EpisodeDto | ShowDto)[];
  format?: ContentFormat;
  genreWiseData: ContentByGenre[];
  restrictToSelectedGenre: boolean;
  selectedGenreId?: number;
  type: ContentType;
}

export const organizeContentByGenre = ({
  microdramas,
  moviesList,
  restrictToSelectedGenre = false,
  selectedGenreId,
  showsList,
}: {
  moviesList: (EpisodeDto | ShowDto)[];
  showsList: (EpisodeDto | ShowDto)[];
  restrictToSelectedGenre?: boolean;
  selectedGenreId?: number;
  microdramas: (EpisodeDto | ShowDto)[];
}): ContentByGenre[] => {
  if (!moviesList.length && !showsList.length && !microdramas.length) return [];
  if (restrictToSelectedGenre && !selectedGenreId) return [];

  const genreWiseData: ContentByGenre[] = [];

  addContentToGenreList({
    contents: moviesList,
    genreWiseData,
    restrictToSelectedGenre,
    selectedGenreId,
    type: ContentType.MOVIE,
  });
  addContentToGenreList({
    contents: showsList,
    genreWiseData,
    restrictToSelectedGenre,
    selectedGenreId,
    type: ContentType.SHOW,
  });
  addContentToGenreList({
    contents: microdramas,
    format: ContentFormat.MICRO_DRAMA,
    genreWiseData,
    restrictToSelectedGenre,
    selectedGenreId,
    type: ContentType.SHOW,
  });
  // Add more type of content to add content to genre list

  genreWiseData.sort((a, b) => a.genreName.localeCompare(b.genreName));

  return genreWiseData;
};

const addContentToGenreList = ({
  contents,
  format,
  genreWiseData,
  restrictToSelectedGenre,
  selectedGenreId,
  type,
}: AddContentToGenreList) => {
  const genreMap = new Map(
    genreWiseData.map((genre) => [genre.genreId, genre]),
  );
  // Process all contents in a single pass
  contents.forEach((content) => {
    const contentItem = {
      _id: content._id,
      complianceRating: content.complianceRating,
      contentType: content.contentType,
      description: content.description,
      duration: content.duration,
      genreList: content.genreList,
      selectedPeripheral: content.selectedPeripheral,
      slug: content.slug,
      thumbnail: content.thumbnail,
      title: content.title,
    };
    const relevantGenres = restrictToSelectedGenre
      ? content.genreList.filter((genre) => genre.id === selectedGenreId)
      : content.genreList;

    // Update genre data in a single pass
    relevantGenres.forEach((genre) => {
      if (!genreMap.has(genre.id)) {
        // Create new genre entry if doesn't exist
        const newGenre = {
          genreId: genre.id,
          genreName: genre.name,
          microdramas: [],
          movies: [],
          shows: [],
        };
        genreMap.set(genre.id, newGenre);
        genreWiseData.push(newGenre);
      }

      // Add content to appropriate list
      const targetGenre = genreMap.get(genre.id) as ContentByGenre;
      const contentList =
        type === ContentType.MOVIE
          ? ContentTypeGenreList.MOVIES
          : type === ContentType.SHOW && format === ContentFormat.MICRO_DRAMA
            ? ContentTypeGenreList.MICRO_DRAMAS
            : ContentTypeGenreList.SHOWS;
      targetGenre[contentList].push(contentItem);
    });
  });
};
