import { Episode } from '../entities/episodes.entity';
import { Show } from '../entities/show.entity';
import { Peripheral } from '../schemas/peripheral.schema';
import { MicroDramaDto } from './microDrama.response.dto';
import { ContentType } from '@app/common/enums/common.enums';

interface EpisodeDto
  extends Pick<
    Episode,
    | '_id'
    | 'title'
    | 'thumbnail'
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
    | 'slug'
    | 'duration'
    | 'complianceRating'
    | 'description'
  > {
  contentType: ContentType;
  selectedPeripheral?: Peripheral;
}

export interface GenreWiseData {
  genreId: number;
  genreName: string;
  microdramas: (EpisodeDto | ShowDto)[];
  movies: (EpisodeDto | ShowDto)[];
  shows: (EpisodeDto | ShowDto)[];
}

export interface GroupByGenreResponseDto {
  genreWiseData: GenreWiseData[];
  top10Microdramas: { data: MicroDramaDto[]; title: string };
  trendingMicrodramas: { data: MicroDramaDto[]; title: string };
}
