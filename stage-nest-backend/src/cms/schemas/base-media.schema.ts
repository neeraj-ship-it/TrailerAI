import { z } from 'zod';

import { visionularHlsSchema } from './base.schema';
import type { Episode } from 'common/entities/episode.entity';

export const BaseEpisodeSchema = z.object({
  artistList: z
    .array(
      z.object({
        callingName: z.string(),
        characterName: z.string(),
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
    )
    .min(0, 'At least one artist is required'), //todo change to 1
  duration: z.number().min(0, 'Duration must be greater than -1'),
  genreList: z
    .array(
      z.object({
        id: z.number().min(1),
        name: z.string().min(1),
      }),
    )
    .min(1, 'At least one genre is required'),
  order: z.number(),
  sourceLink: z.string(),
  thumbnail: z.object({
    horizontal: z.object({
      ratio1: z.object({
        gradient: z.string(),
        sourceLink: z.string().min(1),
      }),
    }),
    square: z.object({
      ratio1: z.object({
        gradient: z.string(),
        sourceLink: z.string().min(1),
      }),
    }),
  }),
  visionularHls: visionularHlsSchema,
  visionularHlsH265: visionularHlsSchema,
}) satisfies z.ZodType<
  Pick<
    Episode,
    | 'artistList'
    | 'genreList'
    | 'sourceLink'
    | 'visionularHls'
    | 'visionularHlsH265'
    | 'duration'
    | 'order'
    | 'thumbnail'
  >
>;
