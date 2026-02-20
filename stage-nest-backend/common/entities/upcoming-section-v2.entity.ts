import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  Property,
} from '@mikro-orm/mongodb';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';

import { ContentType } from '../enums/common.enums';
import {
  Activity,
  Category,
  ContentFormat,
  EmbeddableDescriptorTag,
  EmbeddedGenreSchema,
  EmbeddedShowPeripheral,
  EmbeddedThemeSchema,
  MediaItem,
} from './contents.entity';
import { EmbeddableLegacyArtist, ShowThumbnail } from './show-v2.entity';

export enum ContentState {
  COMING_SOON = 'comingSoon',
}

@Embeddable()
export class ReferenceShow {
  @Property()
  id!: number;

  @Property()
  slug!: string;

  @Property()
  title!: string;
}
export enum UpcomingSectionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DELETED = 'deleted',
  DRAFT = 'draft',
}

@Entity({ collection: 'upcomingsections' })
export class UpcomingSectionEntity extends MongoBaseEntityWithNumberId {
  @Embedded(() => Activity, { object: true })
  activity!: Activity;

  @Embedded(() => EmbeddableLegacyArtist, { array: true, object: true })
  artistList!: EmbeddableLegacyArtist[];

  @Embedded(() => Category, { array: true, object: true })
  categoryList!: Category[];

  @Property()
  contentId?: number;

  @Enum(() => ContentState)
  contentState!: ContentState;

  @Property()
  contentType!: ContentType.SHOW | ContentType.MOVIE;

  @Property()
  contributionField!: string;

  @Property()
  description!: string;

  @Embedded(() => EmbeddableDescriptorTag, { array: true, object: true })
  descriptorTags?: EmbeddableDescriptorTag[];

  @Enum(() => Lang)
  displayLanguage!: Lang;

  @Property()
  displayMedia!: 'media' | 'poster';

  @Property()
  duration!: number;

  @Property()
  endDate!: Date;

  @Property()
  englishValidated!: boolean;

  @Property()
  episodeCount!: number;

  @Enum(() => ContentFormat)
  format?: ContentFormat;

  @Embedded(() => EmbeddedGenreSchema, { array: true, object: true })
  genreList!: EmbeddedGenreSchema[];

  @Property({ type: 'array' })
  gradients!: string[];

  @Property()
  hindiValidated!: boolean;

  @Property()
  isExclusive!: number;

  @Property()
  isExclusiveOrder!: number;

  @Property()
  isLived!: boolean;

  @Property()
  isScheduled!: boolean;

  @Property()
  label!: string;

  @Enum(() => Dialect)
  language!: Dialect;

  @Property()
  likeCount!: number;

  @Embedded(() => MediaItem, { array: true, object: true })
  mediaList!: MediaItem[];

  @Property()
  metaDescription!: string;

  @Property()
  metaKeyword!: string;

  @Property()
  metaTitle!: string;

  @Embedded(() => EmbeddedThemeSchema, { array: true, object: true })
  moods!: EmbeddedThemeSchema[];

  @Property()
  notApplicable!: boolean;

  @Property()
  order!: number;

  @Property()
  peripheralCount!: number;

  @Property()
  posterReleaseDate!: Date;

  @Property()
  publishCount!: number;

  @Property()
  randomOrder!: number;

  @Embedded(() => ReferenceShow, { array: true, object: true })
  referenceShowArr!: ReferenceShow[];

  @Property({ type: 'array' })
  referenceShowIds!: number[];

  @Property({ type: 'array' })
  referenceShowSlugs!: string[];

  @Property({ nullable: true })
  releaseDate!: Date | null;

  @Property()
  seasonCount!: number;

  @Property()
  seasonId?: number;

  @Embedded(() => EmbeddedShowPeripheral, { object: true })
  selectedPeripheral!: EmbeddedShowPeripheral;

  @Property()
  slug!: string;

  @Property({ nullable: true })
  startDate!: Date | null;

  @Enum(() => UpcomingSectionStatus)
  status!: UpcomingSectionStatus;

  @Embedded(() => EmbeddedGenreSchema, { object: true, type: 'array' })
  subGenreList!: EmbeddedGenreSchema[];

  @Property()
  tags!: string;

  @Embedded(() => EmbeddedThemeSchema, { array: true, object: true })
  themes!: EmbeddedThemeSchema[];

  @Embedded(() => ShowThumbnail, { object: true })
  thumbnail!: ShowThumbnail;

  @Property()
  title!: string;

  @Property()
  trailerReleaseDate!: Date;

  @Property()
  viewCount!: number;
}
