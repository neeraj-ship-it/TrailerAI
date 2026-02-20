import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  Property,
  BeforeCreate,
  BeforeUpdate,
} from '@mikro-orm/mongodb';

import { calculateRemainingForNextEpisodeNudgeInSeconds } from '@app/cms/utils/time.utils';
import { MongoBaseEntityWithNumberId } from '@app/common/entities/mongoBase.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import {
  Category,
  ComplianceRating,
  ContentFormat,
  EmbeddableCompliance,
  EmbeddableDescriptorTag,
  EmbeddedShowPeripheral,
  EmbeddedThemeSchema,
  MediaAccessTier,
  MediaItem,
  PeripheralTypeEnum,
  VideoFormat,
  VisionularHls,
} from 'common/entities/contents.entity';
import {
  AllShowThumbnails,
  EmbeddableLegacyArtist,
  ShowThumbnail,
  Subtitle,
} from 'common/entities/show-v2.entity';

export enum EpisodeStatus {
  ACTIVE = 'active',
  COMING_SOON = 'comingSoon',
  COMPLETED = 'completed',
  DELETED = 'deleted',
  DRAFT = 'draft',
  FOR_REVIEW = 'forReview',
  INACTIVE = 'inactive',
  PREVIEW_PUBLISHED = 'preview-published',
  PUBLISHED = 'publish',
}

@Embeddable()
export class Activity {
  @Property()
  action!: string;

  @Property()
  roleId!: number;

  @Property()
  updatedAt!: Date;

  @Property()
  writerName!: string;
}

@Embeddable()
export class GenreSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class MogiHLS {
  @Property()
  hlsSourcelink!: string;

  @Property()
  mogiId!: string;

  @Property()
  status!: string;
}

@Embeddable()
export class ParentDetail {
  @Property()
  seasonTitle!: string;

  @Property()
  slug!: string;

  @Property()
  sourceLink!: string;

  @Property()
  title!: string;
}

@Embeddable()
export class ThumbnailRatio {
  @Property()
  gradient!: string;

  @Property()
  sourceLink!: string;
}

@Embeddable()
export class ThumbnailHorizontal {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio2?: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio3?: ThumbnailRatio;
}

@Embeddable()
export class ThumbnailVertical {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;
}

@Embeddable()
export class ThumbnailSquare {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio1!: ThumbnailRatio;
}

@Embeddable()
export class Thumbnail {
  @Embedded(() => ThumbnailHorizontal, { object: true })
  horizontal!: ThumbnailHorizontal;

  @Embedded(() => ThumbnailSquare, { object: true })
  square!: ThumbnailSquare;

  @Embedded(() => ThumbnailVertical, { object: true })
  vertical!: ThumbnailVertical;
}

export enum EpisodeType {
  COLLECTION = 'collection',
  INDIVIDUAL = 'individual',
  SEASON = 'season',
}

@Embeddable()
export class EmbeddedEpisodePeripheral extends EmbeddedShowPeripheral {
  @Property()
  declare type: PeripheralTypeEnum.EPISODE_PERIPHERAL;
}

@Entity({ collection: 'episodes' })
export class Episode extends MongoBaseEntityWithNumberId {
  @Embedded(() => Activity, { object: true })
  activity!: Activity;

  @Embedded(() => AllShowThumbnails, { array: true })
  allThumbnails: AllShowThumbnails[] = [];

  @Embedded(() => EmbeddableLegacyArtist, { array: true })
  artistList: EmbeddableLegacyArtist[] = [];

  @Property()
  caption!: string;

  @Embedded(() => Category, { array: true })
  categoryList: Category[] = [];

  @Property()
  collectionId!: number;

  @Property()
  collectionSlug!: string;

  @Property()
  comingSoonDate!: Date;

  @Embedded(() => EmbeddableCompliance, { array: true })
  complianceList: EmbeddableCompliance[] = [];

  @Enum(() => ComplianceRating)
  complianceRating!: ComplianceRating;

  @Property()
  consumptionRateCount!: number;

  @Property()
  contributionField!: string;

  @Property({ default: 0 })
  defaultThumbnailIndex!: number;

  @Property()
  description!: string;

  @Property()
  descriptorTags: EmbeddableDescriptorTag[] = [];

  @Enum(() => Lang)
  displayLanguage!: Lang;

  @Property()
  duration!: number;

  @Property()
  endDate!: Date;

  @Property()
  englishValidated!: boolean;

  @Property()
  episodeOrder!: number;

  @Property()
  format!: ContentFormat;

  @Property()
  freeEpisode!: boolean;

  @Property()
  freeEpisodeDuration!: number;

  @Embedded(() => GenreSchema, { array: true })
  genreList: GenreSchema[] = [];

  @Property()
  gradients: string[] = [];

  @Property()
  hindiValidated!: boolean;

  @Property()
  hlsSourceLink!: string;

  @Property()
  introEndTime?: number;

  @Property()
  introStartTime?: number;

  @Property({ nullable: true })
  isComingSoon?: number;

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
  label!: string;

  @Enum(() => Dialect)
  language!: Dialect;

  @Property({ default: 0 })
  likesCount!: number;

  @Property()
  location!: string;

  @Enum(() => MediaAccessTier)
  mediaAccessTier!: MediaAccessTier;

  @Embedded(() => MediaItem, { array: true })
  mediaList: MediaItem[] = [];

  @Embedded(() => MogiHLS, { object: true })
  mogiHLS!: MogiHLS;

  @Property()
  moods: {
    id: number;
    name: string;
  }[] = [];

  @Property()
  nextEpisodeNudgeStartTime?: number;

  @Property()
  order!: number;

  @Embedded(() => ParentDetail, { object: true })
  parentDetail!: ParentDetail;

  @Property()
  preContentWarningText!: string;

  @Property()
  publishCount!: number;

  @Property()
  randomOrder!: number;

  @Property({ nullable: true })
  releaseDate!: Date | null;

  @Property()
  seasonId!: number;

  @Property()
  seasonSlug!: string;

  @Embedded(() => EmbeddedEpisodePeripheral, { object: true })
  selectedPeripheral!: EmbeddedEpisodePeripheral;

  @Property()
  showId!: number;

  @Property()
  showSlug!: string;

  @Property()
  skipDisclaimer!: boolean;

  @Property()
  slug!: string;

  @Property()
  sourceLink!: string;

  @Property()
  startDate!: Date;

  @Enum(() => EpisodeStatus)
  status!: EpisodeStatus;

  @Embedded(() => GenreSchema, { object: true })
  subGenreList: GenreSchema[] = [];

  @Embedded(() => Subtitle, { object: true })
  subtitle!: Subtitle;

  @Property()
  tags!: string;

  @Property()
  tg!: string;

  @Embedded(() => EmbeddedThemeSchema, { array: true, object: true })
  themes!: EmbeddedThemeSchema[];

  @Embedded(() => ShowThumbnail, { object: true })
  thumbnail!: ShowThumbnail;

  @Property()
  title!: string;

  @Enum(() => EpisodeType)
  type!: EpisodeType;

  @Property()
  upcomingScheduleText?: string;

  @Embedded(() => VideoFormat, { array: true })
  videoFormatDetail!: VideoFormat[];

  @Property()
  videoSize!: number;

  @Property()
  viewCount!: number;

  @Embedded(() => VisionularHls, { object: true })
  visionularHls!: VisionularHls;

  @Embedded(() => VisionularHls, { object: true })
  visionularHlsH265!: VisionularHls;

  @Property()
  visionularHlsH265History!: string[];

  @Property()
  visionularHlsHistory!: string[];

  @BeforeCreate()
  @BeforeUpdate()
  setNextEpisodeNudgeStartTime() {
    const calculatedValue = calculateRemainingForNextEpisodeNudgeInSeconds(
      this.duration,
      this.nextEpisodeNudgeStartTime ?? 0,
    );
    this.nextEpisodeNudgeStartTime =
      calculatedValue === 0 ? undefined : calculatedValue;
  }
}
