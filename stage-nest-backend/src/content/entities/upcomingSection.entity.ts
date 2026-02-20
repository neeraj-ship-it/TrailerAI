import { Prop, Schema } from '@nestjs/mongoose';

import { Artist } from '../schemas/artist.schema';
import { Genre } from '../schemas/genre.schema';
import { Media } from '../schemas/media.schema';
import { Peripheral } from '../schemas/peripheral.schema';
import { Thumbnail } from '../schemas/thumbnail.schema';
import { ReferenceShow } from './show.entity';
import { Dialect } from '@app/common/enums/app.enum';
import { BaseModel } from 'common/entities/base.entity';

@Schema({ _id: false, timestamps: true })
export class Activity {
  @Prop({ type: String })
  action!: string;

  @Prop({ type: Number })
  roleId!: number;

  @Prop({ type: String })
  writerName!: string;
}

@Schema({
  _id: false,
  minimize: false,
  strict: false,
  timestamps: true,
  versionKey: false,
})
export class UpcomingSection extends BaseModel {
  @Prop({ required: true, type: Number })
  declare _id: number;

  @Prop({ type: Activity })
  activity?: Activity;

  @Prop({ type: [Artist] })
  artistList!: Artist[];

  @Prop({ type: [Genre] })
  categoryList!: Genre[];

  @Prop({ type: String })
  contentState!: string;

  @Prop({ type: String })
  contentType?: string;

  @Prop({ type: String })
  contributionField!: string;

  @Prop({ type: String })
  description!: string;

  @Prop({ type: String })
  displayLanguage!: string;

  @Prop({ type: String })
  displayMedia?: string;

  @Prop({ type: Number })
  duration!: number;

  @Prop({ type: Date })
  endDate!: Date;

  @Prop({ type: Boolean })
  englishValidated?: boolean;

  @Prop({ type: Number })
  episodeCount!: number;

  @Prop({ type: [Genre] })
  genreList!: Genre[];

  @Prop({ type: [String] })
  gradients!: string[];

  @Prop({ type: Boolean })
  hindiValidated?: boolean;

  @Prop({ type: Number })
  isExclusive!: number;

  @Prop({ type: Boolean })
  isLived?: boolean;

  @Prop({ type: String })
  label!: string;

  @Prop({ enum: Dialect, type: String })
  language!: Dialect; // This is not mistake, DB has it wrong

  @Prop({ type: Number })
  likeCount!: number;

  @Prop({ type: [Media] })
  mediaList!: Media[];

  @Prop({ default: '', type: String })
  metaDescription!: string;

  @Prop({ default: '', type: String })
  metaKeyword!: string;

  @Prop({ default: '', type: String })
  metaTitle!: string;

  @Prop({ type: Boolean })
  notApplicable!: boolean;

  @Prop({ type: Number })
  order!: number;

  @Prop({ type: Date })
  posterReleaseDate!: Date;

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

  @Prop({ type: Date })
  releaseDate!: Date;

  @Prop({ type: Number })
  seasonCount!: number;

  @Prop({ type: Peripheral })
  selectedPeripheral!: Peripheral;

  @Prop({ type: String })
  slug!: string;

  @Prop({ type: Date })
  startDate!: Date;

  @Prop({ type: String })
  status!: string;

  @Prop({ type: [Genre] })
  subGenreList!: Genre[];

  @Prop({ type: String })
  tags!: string;

  @Prop({ type: Thumbnail })
  thumbnail!: Thumbnail;

  @Prop({ type: String })
  title!: string;

  @Prop({ type: Date })
  trailerReleaseDate!: Date;

  @Prop({ type: Number })
  viewCount!: number;
}
