import { Prop, Schema } from '@nestjs/mongoose';

import { Artist } from '../schemas/artist.schema';
import { Category } from '../schemas/category.schema';
import { Genre } from '../schemas/genre.schema';
import { MediaItem } from '../schemas/media.schema';
import { Peripheral } from '../schemas/peripheral.schema';
import { Subtitle } from '../schemas/subtitle.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { VisionularHls } from '../schemas/visionularHls.schema';
import { ContentFormat } from '@app/common/entities/contents.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';
import { VideoResolution } from '@app/common/enums/media.enum';
import { BaseModel } from 'common/entities/base.entity';
import { EpisodeStatus } from 'common/entities/episode.entity';

export enum EpisodeType {
  Collection = 'collection',
  Movie = 'individual',
  Season = 'season',
}

@Schema({ _id: false })
export class ParentDetail {
  @Prop({ type: String })
  seasonTitle!: string;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({ type: String })
  title!: string;
}

@Schema({ _id: false })
export class Clips {
  @Prop({ type: String })
  audioClip!: string;

  @Prop({ type: String })
  videoClip!: string;
}

@Schema({ _id: false })
export class VideoFormatDetail {
  @Prop({ enum: VideoResolution, type: Number })
  bitRate!: VideoResolution;

  @Prop({ type: String })
  label!: string;

  @Prop({ type: Number })
  size!: number;
}

@Schema({ _id: false })
export class ContentWarning {
  @Prop({ type: Number })
  endTime!: number;

  @Prop({ type: String })
  id!: string;

  @Prop({ type: String })
  message!: string;

  @Prop({ type: Number })
  startTime!: number;

  @Prop({ type: String })
  type!: string;
}

@Schema({ _id: false })
export class Compliance {
  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  name!: string;
}

@Schema({ _id: false })
export class Theme {
  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  name!: string;
}

@Schema({ _id: false })
export class Mood {
  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  name!: string;
}
@Schema({ _id: false })
export class DescriptorTag {
  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  name!: string;
}

@Schema({ _id: false })
export class AllThumbnails extends Thumbnail {
  @Prop({ type: Number })
  id!: number;
}

@Schema({ timestamps: true })
export class Episode extends BaseModel {
  @Prop({ type: Number })
  declare _id: number;

  @Prop([Number])
  adsTime!: number[];

  @Prop([AllThumbnails])
  allThumbnails?: AllThumbnails[];

  @Prop([Artist])
  artistList!: Artist[];

  @Prop({ type: String })
  caption!: string;

  @Prop([Category])
  categoryList!: Category[];

  @Prop({ default: false, type: Boolean })
  chatbotFab?: boolean;

  @Prop({ type: Clips })
  clips!: Clips;

  @Prop({ type: Number })
  collectionId!: number;

  @Prop({ type: String })
  collectionSlug!: string;

  @Prop({ type: Date })
  comingSoonDate!: Date;

  @Prop({ nullable: false, type: [Compliance] })
  complianceList?: Compliance[];

  @Prop({ type: String })
  complianceRating?: string;

  @Prop({ type: Number })
  consumptionRateCount!: number;

  @Prop({ type: [ContentWarning] })
  contentWarnings?: ContentWarning[];

  @Prop({ type: String })
  contributionField!: string;

  @Prop({ type: String })
  deepLink!: string;

  @Prop({ type: String })
  description!: string;

  @Prop([DescriptorTag])
  descriptorTags?: DescriptorTag[];

  @Prop({ enum: Lang, type: String })
  displayLanguage!: Lang;

  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: Date })
  endDate!: Date;

  @Prop({ type: Boolean })
  englishValidated!: boolean;

  @Prop({ type: Number })
  episodeOrder!: number;

  @Prop({ type: Number })
  feedRandomOrder!: number;

  @Prop({ enum: ContentFormat, type: String })
  format?: ContentFormat;

  @Prop({ type: Boolean })
  freeEpisode!: boolean;

  @Prop({ type: Number })
  freeEpisodeDuration!: number;

  @Prop({ type: String })
  genre!: string;

  @Prop([Genre])
  genreList!: Genre[];

  @Prop({ type: Boolean })
  hindiValidated!: boolean;

  @Prop({ type: String })
  hlsSourceLink!: string;

  @Prop({ type: Number })
  introEndTime?: number;

  @Prop({ type: Number })
  introStartTime?: number;

  @Prop({ required: false, type: Number })
  isComingSoon?: number;

  @Prop({ type: Number })
  isExclusive!: number;

  @Prop({ type: Number })
  isExclusiveOrder!: number;

  @Prop({ type: Boolean })
  isNewContent!: boolean;

  @Prop({ type: Boolean })
  isPopularContent!: boolean;

  @Prop({ type: Boolean })
  isPremium?: boolean;

  @Prop({ type: String })
  keywordSearch!: string;

  @Prop({ type: String })
  label!: string;

  @Prop({ enum: Dialect, type: String })
  language!: Dialect;

  @Prop({ type: Number })
  like!: number;

  @Prop({ type: Number })
  likeConsumptionRatio!: number;

  @Prop({ type: Number })
  likeCount!: number;

  @Prop({ type: String })
  location!: string;

  @Prop({ type: [MediaItem] })
  mediaList?: MediaItem[];

  @Prop({ type: String })
  metaDescription!: string;

  @Prop({ type: String })
  metaKeyword!: string;

  @Prop([String])
  metaTags!: string[];

  @Prop({ type: String })
  metaTitle?: string;

  @Prop({ type: String })
  mood!: string;

  @Prop([Mood])
  moods?: Mood[];

  @Prop({ type: Number })
  nextEpisodeNudgeStartTime!: number;

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: ParentDetail })
  parentDetail!: ParentDetail;

  @Prop({ type: String })
  preContentWarningText?: string;

  @Prop({ type: Number })
  premiumNessOrder!: number;

  @Prop({ type: Number })
  publishCount!: number;

  @Prop({ type: Number })
  randomOrder!: number;

  @Prop({ type: Date })
  releaseDate!: Date;

  @Prop({ type: Number })
  seasonId!: number;

  @Prop({ type: String })
  seasonSlug!: string;

  @Prop({ type: Peripheral })
  selectedPeripheral?: Peripheral;

  @Prop({ type: Number })
  showId!: number;

  @Prop({ type: String })
  showSlug!: string;

  @Prop({ type: Boolean })
  skipDisclaimer!: boolean;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: String })
  sourceLink!: string;

  @Prop({ type: Date })
  startDate!: Date;

  @Prop({ enum: EpisodeStatus, type: String })
  status!: EpisodeStatus;

  @Prop([Genre])
  subGenreList!: Genre[];

  @Prop({ type: Subtitle })
  subtitle?: Subtitle;

  @Prop(String)
  tags!: string;

  @Prop({ type: String })
  tg!: string;

  @Prop({ type: String })
  theme?: string;

  @Prop([Theme])
  themes?: Theme[];

  @Prop({ type: Thumbnail })
  thumbnail!: Thumbnail;

  @Prop({ type: String })
  title!: string;

  @Prop({ enum: EpisodeType, type: String })
  type!: EpisodeType;

  @Prop({ type: [VideoFormatDetail] })
  videoFormatDetail!: VideoFormatDetail[];

  @Prop({ type: Number })
  videoSize!: number;

  @Prop({ default: 0, type: Number })
  viewCount!: number;

  @Prop({ type: VisionularHls })
  visionularHls!: VisionularHls;

  @Prop({ type: VisionularHls })
  visionularHlsH265!: VisionularHls;

  @Prop([String])
  visionularHlsH265History!: string[];

  @Prop([String])
  visionularHlsHistory!: string[];
}
