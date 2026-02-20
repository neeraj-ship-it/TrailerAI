import {
  Embeddable,
  Embedded,
  Entity,
  Enum,
  Property,
} from '@mikro-orm/mongodb';

import { ArtistStatusEnum } from './artist-v2.entity';
import { LanguageVariantProperty } from '@app/common/schema/localizedString.schema';
import { MongoBaseEntity } from 'common/entities/mongoBase.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';
import { PeripheralMediaType } from 'common/enums/media.enum';

export enum ContentStatus {
  ACTIVE = 'active',
  COMING_SOON = 'comingSoon',
  DELETED = 'deleted',
  DRAFT = 'draft',
  INACTIVE = 'inactive',
  PREVIEW_PUBLISHED = 'preview-published',
  PUBLISH = 'publish',
}

export enum MediaAccessTier {
  FREE = 0,
  FREE_WITH_ADS = 1,
  PAY_PER_VIEW = 2,
  SUBSCRIPTION = 3,
}

export enum PeripheralTypeEnum {
  EPISODE_PERIPHERAL = 'episode-peripheral',
  SHOW_PERIPHERAL = 'show-peripheral',
}

export enum ContentFormat {
  MICRO_DRAMA = 'microdrama',
  STANDARD = 'standard',
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
export class VisionularHls {
  @Property({ default: '' })
  hlsSourcelink!: string;

  @Property({ default: '' })
  rawMediaId!: string;

  @Property({ default: '' })
  sourceLink!: string;

  @Property({ default: '' })
  status!: string;

  @Property({ default: '' })
  visionularTaskId!: string;
}

@Embeddable()
export class ThumbnailRatio {
  @Property()
  gradient!: string;

  @Property()
  sourceLink!: string;
}

@Embeddable()
export class ThumbnailHorizontalOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio_16_9!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio_7_2!: ThumbnailRatio;

  @Embedded(() => ThumbnailRatio, { object: true })
  ratio_tv?: ThumbnailRatio;
}

@Embeddable()
export class ThumbnailVerticalOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio_2_3!: ThumbnailRatio;
}

@Embeddable()
export class ThumbnailSquareOrientation {
  @Embedded(() => ThumbnailRatio, { object: true })
  ratio_1_1!: ThumbnailRatio;
}

@Embeddable()
export class Thumbnail {
  @Embedded(() => ThumbnailHorizontalOrientation, { object: true })
  horizontal!: ThumbnailHorizontalOrientation;

  @Embedded(() => ThumbnailSquareOrientation, { object: true })
  square?: ThumbnailSquareOrientation;
  @Embedded(() => ThumbnailVerticalOrientation, { object: true })
  vertical?: ThumbnailVerticalOrientation;
}

@Embeddable()
export class EmbeddedThemeSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class VideoFormat {
  @Property()
  bitRate!: number;

  @Property()
  label!: string;

  @Property()
  size!: number;
}

@Embeddable()
export class Artist {
  @Property()
  callingName!: string;

  @Property()
  city!: string;

  @Property()
  display!: string;

  @Property()
  firstName!: string;

  @Property()
  gender!: string;

  @Property()
  gradient?: string;

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
export class Category {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class EmbeddableDescriptorTag {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class EmbeddedGenreSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
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
export class Subtitle {
  @Property()
  en!: string;

  @Property()
  hin!: string;
}

@Embeddable()
export class PeripheralThumbnail {
  @Property()
  horizontal!: {
    sourceLink: string;
  };

  @Property()
  square!: {
    sourceLink: string;
  };

  @Property()
  vertical!: {
    sourceLink: string;
  };
}
@Embeddable()
export class EmbeddedShowPeripheral {
  @Property()
  description?: string;

  @Property()
  duration!: number;

  @Property()
  hlsSourceLink!: string;

  @Property()
  rawMediaId!: string;

  @Property()
  sourceLink!: string;

  @Embedded(() => PeripheralThumbnail, { object: true })
  thumbnail!: PeripheralThumbnail;

  @Property()
  title!: string;

  @Enum(() => PeripheralTypeEnum)
  type!: PeripheralTypeEnum;

  @Property()
  viewCount!: number;

  @Embedded(() => VisionularHls, { object: true })
  visionularHls!: VisionularHls;

  @Embedded(() => VisionularHls, { object: true })
  visionularHlsH265!: VisionularHls;
}
@Embeddable()
export class EmbeddedMoodSchema {
  @Property()
  id!: number;

  @Property()
  name!: string;
}
@Embeddable()
export class MediaItem {
  @Property()
  description?: string;

  @Property()
  duration = 0;

  @Property()
  hlsSourceLink = '';

  @Property()
  id!: number;

  @Enum(() => PeripheralMediaType)
  mediaType!: PeripheralMediaType;

  @Property()
  rawMediaId = '';

  @Property({ default: false })
  selectedPeripheralStatus!: boolean;

  @Property({ default: '' })
  sourceLink = '';

  @Embedded(() => Subtitle, { object: true })
  subtitle: Subtitle = {
    en: '',
    hin: '',
  };

  @Embedded(() => MediaItemThumbnail, { object: true })
  thumbnail: MediaItemThumbnail = {
    horizontal: {
      sourceLink: '',
    },
    square: {
      sourceLink: '',
    },
    vertical: {
      sourceLink: '',
    },
  };

  @Property()
  title = '';

  @Enum(() => PeripheralTypeEnum)
  type!: PeripheralTypeEnum;

  @Property()
  viewCount = 0;

  @Embedded(() => VisionularHls, {
    object: true,
  })
  visionularHls: VisionularHls = {
    hlsSourcelink: '',
    rawMediaId: '',
    sourceLink: '',
    status: '',
    visionularTaskId: '',
  };

  @Embedded(() => VisionularHls, {
    object: true,
  })
  visionularHlsH265: VisionularHls = {
    hlsSourcelink: '',
    rawMediaId: '',
    sourceLink: '',
    status: '',
    visionularTaskId: '',
  };

  @Property({ default: [] })
  visionularHlsH265History: string[] = [];

  @Property({ default: [] })
  visionularHlsHistory: string[] = [];
}

@Embeddable()
export class EmbeddableCompliance {
  @Property()
  id!: number;

  @Property()
  name!: string;
}

@Embeddable()
export class AllThumbnail extends Thumbnail {
  @Property()
  id?: number;

  /**
   * Indicates whether this thumbnail set has been chosen as the active one for
   * the content. This field is optional to maintain backward-compatibility with
   * existing documents.
   */
  @Property({ nullable: true })
  selected?: boolean;
}
@Embeddable()
export class EmbeddableCharacter {
  @Property()
  en!: string;

  @Property()
  hin!: string;
}

@Embeddable()
export class EmbeddableArtistV2 {
  @Embedded(() => EmbeddableCharacter, { object: true })
  character!: EmbeddableCharacter;

  @Property()
  description!: LanguageVariantProperty;

  @Property()
  image!: string;

  @Property()
  name!: LanguageVariantProperty;

  @Property()
  role!: string;

  @Property()
  slug!: string;

  @Enum(() => ArtistStatusEnum)
  status!: ArtistStatusEnum;

  @Property()
  type!: string;
}

export enum ComplianceRating {
  A = 'A',
  U = 'U',
  U_13 = 'U/A 13+',
  U_16 = 'U/A 16+',
  U_18 = 'U/A 18+',
  U_7 = 'U/A 7+',
}

@Entity()
export class Contents extends MongoBaseEntity {
  @Embedded(() => [AllThumbnail], { object: true })
  allThumbnails!: AllThumbnail[];

  @Embedded(() => [EmbeddableArtistV2], { object: true })
  artistList!: EmbeddableArtistV2[];

  @Embedded(() => [Category], { object: true })
  categoryList!: Category[];

  @Embedded(() => [EmbeddableCompliance], { nullable: true, object: true })
  complianceList!: EmbeddableCompliance[];

  @Enum(() => ComplianceRating)
  complianceRating: ComplianceRating | null = null;

  @Property()
  consumptionRateCount!: number;

  @Property()
  contentId!: number;

  @Enum(() => ContentTypeV2)
  contentType!: ContentTypeV2;

  @Property()
  contributionField!: string;

  @Property()
  createdBy?: string;

  @Property({ default: 0 })
  defaultThumbnailIndex!: number;

  @Property()
  description!: string;

  @Embedded(() => [EmbeddableDescriptorTag], { object: true })
  descriptorTags!: EmbeddableDescriptorTag[];

  @Enum(() => Dialect)
  dialect!: Dialect;

  @Property()
  duration!: number;

  @Property()
  endDate!: Date;

  @Property()
  episodeCount!: number;

  @Enum(() => ContentFormat)
  @Property({ default: ContentFormat.STANDARD })
  format!: ContentFormat;

  @Embedded(() => [EmbeddedGenreSchema], { object: true })
  genres!: EmbeddedGenreSchema[];

  @Property()
  gradients!: string[];

  @Property({ nullable: true })
  isComingSoon?: boolean;

  @Property()
  isExclusive!: boolean;

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

  @Enum(() => Lang)
  language!: Lang;

  @Enum(() => MediaAccessTier)
  mediaAccessTier!: MediaAccessTier;

  @Embedded(() => [MediaItem], { object: true })
  mediaList!: MediaItem[];

  @Property()
  metaDescription!: string;

  @Embedded(() => [EmbeddedMoodSchema], { object: true })
  moods!: EmbeddedMoodSchema[];

  @Property()
  oldContentId!: number;

  @Property()
  plotKeywords!: string[];

  @Property()
  primaryDialect!: Dialect;

  @Property()
  publishCount!: number;

  @Property()
  releaseDate!: Date;

  @Property()
  seasonCount!: number;

  @Embedded(() => EmbeddedShowPeripheral, { object: true })
  selectedPeripheral!: EmbeddedShowPeripheral;

  @Property()
  slug!: string;

  @Property()
  sourcedFrom!: number;

  @Property()
  startDate!: Date;

  @Enum(() => ContentStatus)
  status!: ContentStatus;

  @Embedded(() => [EmbeddedGenreSchema], { object: true })
  subGenres!: EmbeddedGenreSchema[];

  @Property()
  targetAudience!: string[];

  @Embedded(() => [EmbeddedThemeSchema], { object: true })
  themes!: EmbeddedThemeSchema[];

  @Embedded(() => Thumbnail, { object: true })
  thumbnail!: Thumbnail;

  @Property()
  title!: string;

  @Property()
  upcomingScheduleText?: string;

  @Property()
  updatedBy?: string;

  @Embedded(() => VideoFormat, { array: true })
  videoFormatDetail!: VideoFormat[];
}
