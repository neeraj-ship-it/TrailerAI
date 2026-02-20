import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  Property,
} from '@mikro-orm/mongodb';

import { Episode } from './episode.entity';
import { MongoBaseEntity } from './mongoBase.entity';
import { Show } from './show-v2.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';

export enum CombinedPlatterType {
  D0 = 'D0',
  DN = 'Dn',
}

export enum YoutubeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Embeddable()
export class YoutubeSchema {
  @Property({ default: '' })
  label!: string;

  @Enum(() => YoutubeStatus)
  status!: YoutubeStatus;

  @Property({ default: ContentType.YOUTUBE })
  type!: ContentType.YOUTUBE;

  @Property()
  youTubeImage!: string;

  @Property()
  youTubeVideoId!: string;

  @Property()
  youTubeVideoTitle!: string;
}

export class CombinedPlatterShow extends Show {
  @Property()
  contentType!: ContentType.SHOW;

  @Property({ nullable: true })
  defaultImage = false;

  @Property({ nullable: true })
  defaultThumbnailIndex = 0;

  @Property()
  declare id: number;

  @Property()
  showId!: number;

  @Property()
  showSlug!: string;

  @Property({ default: ContentType.SHOW })
  type!: ContentType.SHOW;
}

export class CombinedPlatterEpisode extends Episode {
  @Property()
  contentType!: ContentType.MOVIE;

  @Property({ nullable: true })
  defaultImage = false;

  @Property({ nullable: true })
  defaultThumbnailIndex = 0;

  @Property()
  declare id: number;
}

@Entity({ collection: 'combinedPlatter' })
export class CombinedPlatter extends MongoBaseEntity {
  @Property()
  all!: (CombinedPlatterShow | CombinedPlatterEpisode)[];

  @Enum(() => Dialect)
  dialect!: Dialect;

  @Property()
  individual!: Episode[];

  @Enum(() => Lang)
  lang!: Lang;

  @Property()
  show!: Show[];

  @Enum(() => CombinedPlatterType)
  type!: CombinedPlatterType;

  @Embedded(() => [YoutubeSchema])
  youtube!: YoutubeSchema[];
}
