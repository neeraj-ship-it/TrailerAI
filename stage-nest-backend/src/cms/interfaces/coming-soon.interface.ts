import { ContentStatus } from 'common/entities/contents.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { SeasonStatus } from 'src/cms/entities/seasons.entity';

export interface EntityStatus {
  content: ContentStatus;
  episode: EpisodeStatus;
  season: SeasonStatus;
  show: ShowStatus;
}
