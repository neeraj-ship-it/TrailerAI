import { z } from 'zod';

import {
  Episode,
  EpisodeStatus,
} from '../../../common/entities/episode.entity';
import { BaseEpisodeSchema } from './base-media.schema';
import {
  thumbnailRatioSchema,
  flexibleNumberSchema,
  visionularHlsSchema,
} from './base.schema';
// Episode schema with publishable validation rules
export const publishableEpisodeSchema = BaseEpisodeSchema.extend({
  description: z.string(),
  introEndTime: flexibleNumberSchema.optional(),
  introStartTime: flexibleNumberSchema.optional(),
  nextEpisodeNudgeStartTime: flexibleNumberSchema.optional(),
  order: flexibleNumberSchema,
  seasonId: flexibleNumberSchema,
  seasonSlug: z.string(),
  showId: flexibleNumberSchema,
  showSlug: z.string(),
  slug: z.string(),
  sourceLink: z.string(),
  status: z.nativeEnum(EpisodeStatus),
  thumbnail: z.object({
    horizontal: z.object({
      ratio1: z.object({
        gradient: z.string(),
        sourceLink: z.string().min(1, 'Episode thumbnail (16:9) is required'),
      }),
      ratio2: thumbnailRatioSchema.required(), // This is here because app is not able to handle optional fields
      ratio3: thumbnailRatioSchema.required(),
    }),
    square: z.object({
      ratio1: z.object({
        gradient: z.string(),
        sourceLink: z.string().min(1, 'Episode thumbnail (1:1) is required'),
      }),
    }),
    vertical: z.object({
      ratio1: thumbnailRatioSchema,
    }),
  }),
  title: z.string(),
  visionularHls: visionularHlsSchema,
  visionularHlsH265: visionularHlsSchema,
}) satisfies z.ZodType<
  Pick<
    Episode,
    | 'artistList'
    | 'duration'
    | 'description'
    | 'genreList'
    | 'seasonSlug'
    | 'showSlug'
    | 'slug'
    | 'sourceLink'
    | 'status'
    | 'thumbnail'
    | 'title'
    | 'visionularHls'
    | 'visionularHlsH265'
  >
>;

export const publishableMicrodramaEpisodeSchema = publishableEpisodeSchema.omit(
  {
    description: true,
    introEndTime: true,
    introStartTime: true,
    nextEpisodeNudgeStartTime: true,
    thumbnail: true,
    title: true,
  },
) satisfies z.ZodType<
  Pick<
    Episode,
    | 'artistList'
    | 'duration'
    | 'genreList'
    | 'seasonSlug'
    | 'showSlug'
    | 'slug'
    | 'sourceLink'
    | 'status'
    | 'visionularHls'
    | 'visionularHlsH265'
  >
>;

export const validActiveEpisodeSchema = publishableEpisodeSchema
  .omit({
    artistList: true,
    introEndTime: true,
    introStartTime: true,
    nextEpisodeNudgeStartTime: true,
  })
  .extend({
    artistList: z.array(
      z.object({
        callingName: z.string(),
        characterName: z.string().optional(),
        city: z.string(),
        display: z.string(),
        firstName: z.string(),
        gender: z.string(),
        id: z.number(),
        lastName: z.string(),
        name: z.string(),
        order: z.number(),
        profilePic: z.string(),
        slug: z.string(),
        status: z.string(),
      }),
    ),
    introEndTime: flexibleNumberSchema.optional(),
    introStartTime: flexibleNumberSchema.optional(),
    nextEpisodeNudgeStartTime: flexibleNumberSchema.optional(),
  });

export const validActiveMicrodramaEpisodeSchema = validActiveEpisodeSchema.omit(
  {
    description: true,
    introEndTime: true,
    introStartTime: true,
    nextEpisodeNudgeStartTime: true,
    thumbnail: true,
    title: true,
  },
) satisfies z.ZodType<
  Pick<
    Episode,
    | 'duration'
    | 'genreList'
    | 'seasonSlug'
    | 'showSlug'
    | 'slug'
    | 'sourceLink'
    | 'status'
    | 'visionularHls'
    | 'visionularHlsH265'
  >
>;
