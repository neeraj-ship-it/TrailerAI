import { Season } from '../entities/season.entity';
import { EpisodeDto } from './episode.dto';

export interface SeasonDto extends Omit<Season, 'episodes'> {
  episodes: EpisodeDto[];
}
