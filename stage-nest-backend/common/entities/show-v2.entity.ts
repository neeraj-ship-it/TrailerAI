import {
  Entity,
  Property,
  Enum,
  Embedded,
  Embeddable,
} from '@mikro-orm/mongodb';

import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';

import {
  Category,
  EmbeddableCompliance,
  ThumbnailRatio,
  EmbeddedShowPeripheral,
  VideoFormat,
  EmbeddedGenreSchema,
  EmbeddedThemeSchema,
  MediaItem,
  MediaAccessTier,
  ComplianceRating,
  Activity,
  ContentFormat,
} from './contents.entity';

export enum ShowStatus {
  ACTIVE = 'active',
  COMING_SOON = 'comingSoon',
  DELETED = 'deleted',
  DRAFT = 'draft',
  PREVIEW_PUBLISH = 'preview-published',
  PUBLISHED = 'publish',
}

@Embeddable()
export class ThemeSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class MoodSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class DescriptorTagSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class ReferenceShow {
  @Property()
  display!: string;

  @Property()
  id!: number;

  @Property()
  slug!: string;

  @Property()
  title!: string;

  @Property()
  value!: number;
}

@Embeddable()
export class MediaItemThumbnailData {
  @Property()
  sourceLink!: string;
}

@Embeddable()
export class MediaItemThumbnail {
  @Embedded(() => MediaItemThumbnailData, { object: true })
  horizontal!: MediaItemThumbnailData;
  @Embedded(() => MediaItemThumbnailData, { object: true })
  square!: MediaItemThumbnailData;
  @Embedded(() => MediaItemThumbnailData, { object: true })
  vertical!: MediaItemThumbnailData;
}

@Embeddable()
export class ShowThumbnailHorizontalOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio2?: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio3?: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio4?: ThumbnailRatio;
}

@Embeddable()
export class ShowThumbnailVerticalOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1?: ThumbnailRatio;
}

@Embeddable()
export class ShowThumbnailSquareOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;
}

@Embeddable()
export class ShowThumbnail {
  @Embedded(() => ShowThumbnailHorizontalOrientation, { object: true })
  horizontal!: ShowThumbnailHorizontalOrientation;

  @Embedded(() => ShowThumbnailSquareOrientation, { object: true })
  square?: ShowThumbnailSquareOrientation;
  @Embedded(() => ShowThumbnailVerticalOrientation, { object: true })
  vertical?: ShowThumbnailVerticalOrientation;
}

export enum SubtitleStatus {
  DELETED = 'deleted',
  FAILED = 'failed',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  QUEUED = 'queued',
}

export enum GenerationMethod {
  ASR = 'automatic_speech_recognition',
  MANUAL = 'manual',
}

@Embeddable()
export class SubtitleMetadata {
  @Property({ nullable: true })
  jobId?: string;

  @Property()
  lastModified!: Date;

  @Enum(() => GenerationMethod)
  method!: GenerationMethod;

  @Property({ nullable: true })
  modifiedBy?: string;

  @Enum(() => SubtitleStatus)
  status!: SubtitleStatus;
}

@Embeddable()
export class Subtitle {
  @Property()
  en!: string;

  @Embedded(() => SubtitleMetadata, { nullable: true, object: true })
  enMetadata: SubtitleMetadata | null = null;

  @Property()
  hin!: string;

  @Embedded(() => SubtitleMetadata, { nullable: true, object: true })
  hinMetadata: SubtitleMetadata | null = null;
}

@Embeddable()
export class EmbeddableLegacyArtist {
  @Property()
  callingName!: string;

  @Property()
  characterName!: string;
  @Property()
  city!: string;

  @Property()
  display!: string;

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

  @Property()
  status!: string;
}

@Embeddable()
export class AllShowThumbnails extends ShowThumbnail {
  @Property()
  id?: number;

  /**
   * Indicates whether this thumbnail set has been chosen as the active one for
   * the show. Optional for backward-compatibility.
   */
  @Property({ nullable: true })
  selected?: boolean;
}

@Entity({ collection: 'shows' })
export class Show extends MongoBaseEntityWithNumberId {
  @Embedded(() => Activity, { object: true })
  activity!: Activity;

  @Embedded(() => AllShowThumbnails, { array: true, object: true })
  allThumbnails!: AllShowThumbnails[];

  @Embedded(() => EmbeddableLegacyArtist, { array: true, object: true })
  artistList!: EmbeddableLegacyArtist[];

  @Embedded(() => Category, { array: true, object: true })
  categoryList!: Category[];

  @Property({ type: 'array' })
  complianceList!: EmbeddableCompliance[];

  @Enum(() => ComplianceRating)
  complianceRating: ComplianceRating | null = null;

  @Property()
  consumptionRateCount!: number;

  @Property()
  contributionField!: string;

  @Property()
  createdBy?: string;

  @Property()
  crossTrailer!: string;

  @Property({ default: 0 })
  defaultThumbnailIndex!: number;

  @Property()
  description!: string;

  @Embedded(() => DescriptorTagSchema, { array: true, object: true })
  descriptorTags?: DescriptorTagSchema[];

  @Enum(() => Lang)
  displayLanguage!: Lang;

  @Property()
  duration!: number;

  @Property()
  endDate!: Date;

  @Property()
  englishValidated!: boolean;

  @Property()
  episodeCount!: number;

  @Enum(() => ContentFormat)
  @Property({ default: ContentFormat.STANDARD })
  format!: ContentFormat;

  @Embedded(() => EmbeddedGenreSchema, { array: true, object: true })
  genreList!: EmbeddedGenreSchema[];

  @Property({ type: 'array' })
  gradients!: string[];

  @Property()
  hindiValidated!: boolean;

  @Property({ nullable: true })
  isComingSoon?: boolean;

  @Property()
  isExclusive!: number;

  @Property()
  isExclusiveOrder!: number;

  @Property()
  isNewContent!: boolean;

  @Property()
  isPopularContent!: boolean;

  @Property()
  isPremium!: boolean;

  @Property()
  isScheduled!: boolean;

  @Property()
  keywordSearch!: string;

  @Property()
  label?: string;

  @Enum(() => Dialect)
  language!: Dialect;

  @Property()
  likeConsumptionRatio!: number;

  @Property()
  likeCount!: number;

  @Enum(() => MediaAccessTier)
  mediaAccessTier!: MediaAccessTier;

  @Embedded(() => MediaItem, { array: true, object: true })
  mediaList!: MediaItem[];

  @Property()
  metaDescription!: string;

  @Property()
  metaKeyword!: string;

  @Property({ type: 'array' })
  metasTags?: string[];

  @Property()
  metaTitle!: string;

  @Property()
  mlTags?: string;

  @Embedded(() => MoodSchema, { array: true, object: true })
  moods!: MoodSchema[];

  @Property()
  order!: number;

  @Property()
  peripheralCount!: number;

  @Property({ type: 'array' })
  plotKeywords?: string[];

  @Property()
  preContentWarningText!: string;

  @Property()
  premiumNessOrder!: number;

  @Property()
  primaryDialect!: Dialect;

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

  @Property()
  releaseDate!: string;

  @Property()
  seasonCount!: number;

  @Embedded(() => EmbeddedShowPeripheral, { nullable: true, object: true })
  selectedPeripheral!: EmbeddedShowPeripheral;

  @Property()
  slug!: string;

  @Property()
  startDate!: Date;

  @Enum(() => ShowStatus)
  status!: ShowStatus;

  @Embedded(() => EmbeddedGenreSchema, { object: true })
  subGenreList!: EmbeddedGenreSchema[];

  @Property()
  tags!: string;

  @Property()
  targetAudience!: string[];

  @Embedded(() => EmbeddedThemeSchema, { array: true, object: true })
  themes!: EmbeddedThemeSchema[];

  @Embedded(() => ShowThumbnail, { object: true })
  thumbnail!: ShowThumbnail;

  @Property()
  title!: string;

  @Property({ nullable: true })
  upcomingScheduleText?: string;

  @Embedded(() => VideoFormat, {
    array: true,
    nullable: true,
    object: true,
  })
  videoFormatDetail!: VideoFormat[];

  @Property()
  viewCount!: number;
}
