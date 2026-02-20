import { Prop, Schema } from '@nestjs/mongoose';

import { BaseModel } from '../../../common/entities/base.entity';
import { Artist } from '../schemas/artist.schema';
import { Category } from '../schemas/category.schema';
import { Genre } from '../schemas/genre.schema';
import { MediaItem } from '../schemas/media.schema';
import { Peripheral } from '../schemas/peripheral.schema';
import { SubGenre } from '../schemas/subgenre.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { VisionularHls } from '../schemas/visionularHls.schema';
import { VideoFormatDetail } from './episodes.entity';
import { Dialect, Lang } from '@app/common/enums/app.enum';

export enum ContentFormat {
  MICRO_DRAMA = 'microdrama',
  STANDARD = 'standard',
}
import { ShowStatus } from 'common/entities/show-v2.entity';

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

@Schema({ _id: false })
export class ReferenceShow {
  @Prop({ type: String })
  display!: string;

  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: String })
  title!: string;

  @Prop({ type: Number })
  value!: number;
}

@Schema({ timestamps: true })
export class Show extends BaseModel {
  @Prop({ type: Number })
  declare _id: number;

  @Prop({ type: [AllThumbnails] })
  allThumbnails?: AllThumbnails[];

  @Prop({ type: [Artist] })
  artistList!: Artist[];

  @Prop({ type: [Category] })
  categoryList!: Category[];

  @Prop({ default: false, type: Boolean })
  chatbotFab?: boolean;

  @Prop({ type: [String] })
  complianceList!: string[];

  @Prop({ type: String })
  complianceRating!: string;

  @Prop({ type: Number })
  consumptionRateCount!: number;

  @Prop({ type: String })
  contributionField!: string;

  @Prop({ type: String })
  crossTrailer!: string;

  @Prop({ default: 0, type: Number })
  defaultThumbnailIndex!: number;

  @Prop({ type: String })
  description!: string;

  @Prop({ type: [DescriptorTag] })
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
  episodeCount!: number;

  @Prop({
    default: ContentFormat.STANDARD,
    enum: ContentFormat,
    type: String,
  })
  format!: ContentFormat;

  @Prop({ type: [Genre] })
  genreList!: Genre[];

  @Prop({ type: Boolean })
  hindiValidated!: boolean;

  @Prop({ required: false, type: Boolean })
  isComingSoon?: boolean;

  @Prop({ type: Number })
  isExclusive!: number;

  @Prop({ type: Number })
  isExclusiveOrder!: number;

  @Prop({ type: Boolean })
  isNewContent!: boolean;

  @Prop({ type: Boolean })
  isPopularContent!: boolean;

  @Prop({ type: Boolean })
  isPremium!: boolean;

  @Prop({ default: false, type: Boolean })
  isScheduled!: boolean;

  @Prop({ default: '', type: String })
  keywordSearch!: string;

  @Prop({ default: '', type: String })
  label?: string;

  @Prop({ enum: Dialect, type: String })
  language!: Dialect;

  @Prop({ type: Number })
  likeConsumptionRatio!: number;

  @Prop({ type: Number })
  likeCount!: number;

  @Prop({ type: Number })
  mediaAccessTier?: number;

  @Prop({ type: [MediaItem] })
  mediaList?: MediaItem[];

  @Prop({ type: String })
  metaDescription!: string;

  @Prop({ type: String })
  metaKeyword!: string;

  @Prop({ type: [String] })
  metasTags?: string[];

  @Prop({ type: String })
  metaTitle!: string;

  @Prop({ default: '', type: String })
  mlTags?: string;

  @Prop({ type: [Mood] })
  moods?: Mood[];

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: Number })
  peripheralCount!: number;

  @Prop({ type: [String] })
  plotKeywords?: string[];

  @Prop({ type: String })
  preContentWarningText!: string;

  @Prop({ type: Number })
  premiumNessOrder!: number;

  @Prop({ type: Number })
  publishCount!: number;

  @Prop({ type: Number })
  randomOrder!: number;

  @Prop({ default: [], type: [ReferenceShow] })
  referenceShowArr!: ReferenceShow[];

  @Prop({ type: [Number] })
  referenceShowIds!: number[];

  @Prop({ type: [String] })
  referenceShowSlugs!: string[];

  @Prop({ type: String })
  releaseDate!: string;

  @Prop({ type: Number })
  seasonCount!: number;

  @Prop({ type: Peripheral })
  selectedPeripheral?: Peripheral;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: Date })
  startDate!: Date;

  @Prop({ enum: ShowStatus })
  status!: ShowStatus;

  @Prop({ type: [SubGenre] })
  subGenreList!: SubGenre[];

  @Prop({ type: String })
  tags!: string;

  @Prop({ type: [Theme] })
  themes?: Theme[];

  @Prop({ type: Thumbnail })
  thumbnail!: Thumbnail;

  @Prop({ type: String })
  title!: string;

  @Prop({ required: false, type: String })
  upcomingScheduleText?: string;

  @Prop({ type: [VideoFormatDetail] })
  videoFormatDetail?: VideoFormatDetail[];

  @Prop({ type: Number })
  viewCount!: number;

  @Prop({ type: VisionularHls })
  visionularHls?: VisionularHls;
}
