import { Prop, Schema } from '@nestjs/mongoose';

import { Category } from '../schemas/category.schema';
import { Genre } from '../schemas/genre.schema';
import { MediaItem } from '../schemas/media.schema';
import { Peripheral } from '../schemas/peripheral.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { AllThumbnails } from './show.entity';
import { BaseModel } from 'common/entities/base.entity';

export enum SeasonStatus {
  ACTIVE = 'active',
  COMING_SOON = 'comingSoon',
  DELETED = 'deleted',
  DRAFT = 'draft',
  FOR_REVIEW = 'forReview',
  INACTIVE = 'inactive',
  PREVIEW_PUBLISHED = 'preview-published',
  PUBLISH = 'publish',
}

@Schema({ _id: false })
export class SeasonArtist {
  @Prop({ type: String })
  callingName!: string;

  @Prop({ type: String })
  city!: string;

  @Prop({ type: String })
  display!: string;

  @Prop({ type: String })
  firstName!: string;

  @Prop({ type: String })
  gender!: string;

  @Prop({ type: Number })
  id!: number;

  @Prop({ type: String })
  lastName!: string;

  @Prop({ type: String })
  name!: string;

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: String })
  profilePic!: string;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: String })
  status!: string;

  @Prop({ type: Number })
  value!: number;
}

@Schema({ timestamps: true, versionKey: false })
export class Season extends BaseModel {
  @Prop({ type: Number })
  declare _id: number;

  @Prop({ type: [Thumbnail] })
  allThumbnails!: AllThumbnails[];

  @Prop({ type: [SeasonArtist] })
  artistList!: SeasonArtist[];

  @Prop({ type: [Category] })
  categoryList!: Category[];

  @Prop({ type: [{ id: Number, name: String }] })
  complianceList!: { id: number; name: string }[];

  @Prop({ type: String })
  complianceRating!: string;

  @Prop({ type: String })
  contributionField!: string;

  @Prop({ type: Boolean })
  defaultImage!: boolean;

  @Prop({ type: Number })
  defaultThumbnailIndex!: number;

  @Prop({ type: String })
  description!: string;

  @Prop({ type: String })
  displayLanguage!: string;

  @Prop({ type: Date })
  endDate!: Date;

  @Prop({ type: Number })
  episodeCount!: number;

  @Prop({ type: [Genre] })
  genreList!: Genre[];

  @Prop({ type: [String] })
  gradients!: string[];

  @Prop({ required: false, type: Boolean })
  isComingSoon?: boolean;

  @Prop({ type: String })
  label!: string;

  @Prop({ type: String })
  language!: string;

  @Prop({ type: [MediaItem] })
  mediaList!: MediaItem[];

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: String })
  preContentWarningText!: string;

  @Prop({ type: Peripheral })
  selectedPeripheral!: Peripheral;

  @Prop({ type: Number })
  showId!: number;

  @Prop({ type: String })
  showSlug!: string;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: Date })
  startDate!: Date;

  @Prop({ enum: SeasonStatus, type: String })
  status!: SeasonStatus;

  @Prop({ type: [Genre] })
  subGenreList!: Genre[];

  @Prop({ type: String })
  tags!: string;

  @Prop({ type: Thumbnail })
  thumbnail!: Thumbnail;

  @Prop({ type: String })
  title!: string;

  @Prop({ type: Number })
  viewCount!: number;
}
