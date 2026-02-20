import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  Property,
} from '@mikro-orm/mongodb';

import { ComplianceRating } from 'common/entities/contents.entity';
import { MongoBaseEntityWithNumberId } from 'common/entities/mongoBase.entity';
import {
  AllShowThumbnails,
  ShowThumbnail,
} from 'common/entities/show-v2.entity';

export enum SeasonStatus {
  ACTIVE = 'active',
  COMING_SOON = 'comingSoon',
  DELETED = 'deleted',
  DRAFT = 'draft',
  INACTIVE = 'inactive',
  PREVIEW_PUBLISHED = 'preview-published',
  PUBLISHED = 'published',
}

@Embeddable()
class ThumbnailRatio {
  @Property()
  gradient!: string;

  @Property()
  sourceLink!: string;
}

@Embeddable()
class SeasonThumbnail {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio2!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio3!: ThumbnailRatio;
}

@Embeddable()
export class SeasonThumbnailSet {
  @Embedded(() => SeasonThumbnail, { object: true })
  horizontal!: SeasonThumbnail;

  @Embedded(() => SeasonThumbnail, { object: true })
  square!: SeasonThumbnail;

  @Embedded(() => SeasonThumbnail, { object: true })
  vertical!: SeasonThumbnail;
}

@Embeddable()
class Artist {
  @Property()
  callingName!: string;

  @Property()
  city!: string;

  @Property()
  firstName!: string;

  @Property()
  gender!: string;

  @Property()
  id!: number;

  @Property()
  lastName!: string;

  @Property()
  name!: string;

  @Property()
  order!: number;

  @Property()
  profilePic!: string;

  @Property()
  slug!: string;
  status!: string;
}

@Embeddable()
class Category {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
class Genre {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
class Media {
  @Property()
  id!: number;

  @Property()
  type!: string;

  @Property()
  url!: string;
}

@Embeddable()
class Peripheral {
  @Property()
  id!: number;

  @Property()
  type!: string;

  @Property()
  value!: number;
}

@Entity({ collection: 'seasons' })
export class Seasons extends MongoBaseEntityWithNumberId {
  @Embedded(() => AllShowThumbnails, { array: true, object: true })
  allThumbnails!: AllShowThumbnails[];

  @Embedded(() => Artist, { array: true, object: true })
  artistList!: Artist[];

  @Embedded(() => Category, { array: true, object: true })
  categoryList!: Category[];

  @Enum(() => ComplianceRating)
  complianceRating: ComplianceRating | null = null;

  @Property()
  contributionField!: string;

  @Property()
  description!: string;

  @Property()
  displayLanguage!: string;

  @Property()
  endDate!: Date;

  @Property()
  episodeCount!: number;

  @Embedded(() => Genre, { array: true, object: true })
  genreList!: Genre[];

  @Property()
  gradients!: string[];

  @Property({ nullable: true })
  isComingSoon?: boolean;

  @Property()
  label!: string;

  @Property()
  language!: string;

  @Embedded(() => Media, { array: true, object: true })
  mediaList!: Media[];

  @Property()
  order!: number;

  @Embedded(() => Peripheral, { object: true })
  selectedPeripheral!: Peripheral;

  @Property()
  showId!: number;

  @Property()
  showSlug!: string;

  @Property()
  slug!: string;

  @Property()
  startDate!: Date;

  @Enum(() => SeasonStatus)
  status!: SeasonStatus;

  @Embedded(() => Genre, { array: true, object: true })
  subGenreList!: Genre[];

  @Property()
  tags!: string;

  @Embedded(() => ShowThumbnail, { object: true })
  thumbnail!: ShowThumbnail;

  @Property()
  title!: string;

  @Property()
  viewCount!: number;
}
