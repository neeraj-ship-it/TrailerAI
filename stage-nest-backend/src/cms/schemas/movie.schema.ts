import { z } from 'zod';

import { BaseEpisodeSchema } from './base-media.schema';
import { flexibleNumberSchema } from './base.schema';
import { mediaItemSchema } from './show.schema';
import { ContentType } from '@app/common/enums/common.enums';
import { PeripheralTypeEnum } from 'common/entities/contents.entity';
import { Episode, EpisodeStatus } from 'common/entities/episode.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';

const movieMediaItemSchema = mediaItemSchema.omit({
  type: true,
});

const movieSelectedPeripheralSchema = mediaItemSchema
  .extend({
    type: z.literal(PeripheralTypeEnum.EPISODE_PERIPHERAL),
  })
  .omit({
    id: true,
    mediaType: true,
    selectedPeripheralStatus: true,
    subtitle: true,
    visionularHlsH265History: true,
    visionularHlsHistory: true,
  });

// Movie schema with publishable validation rules
export const publishableMovieSchema = BaseEpisodeSchema.extend({
  mediaList: z.array(z.any()).refine(
    (mediaItems) => {
      return mediaItems.every((item) => {
        if (item.mediaType === PeripheralMediaType.COMING_SOON) return true;
        const result = movieMediaItemSchema.safeParse(item);
        return result.success;
      });
    },
    {
      message: 'Invalid trailer',
    },
  ),
  moods: z
    .array(
      z.object({
        id: z.number().min(1, 'Mood ID is required'),
        name: z.string().min(1, 'Mood name is required'),
      }),
    )
    .min(1, 'At least one mood is required'),
  nextEpisodeNudgeStartTime: flexibleNumberSchema.optional(),
  order: z.number(),
  seasonId: flexibleNumberSchema,
  seasonSlug: z.string(),
  selectedPeripheral: movieSelectedPeripheralSchema,
  slug: z.string(),
  sourceLink: z.string(),
  status: z.nativeEnum(EpisodeStatus),
  tags: z.string().min(1, 'At least one plot keyword is required'),
  // targetAudience: z.string().min(1, 'Target audience is required'),
  themes: z
    .array(
      z.object({
        id: z.number().min(1, 'Theme ID is required'),
        name: z.string().min(1, 'Theme name is required'),
      }),
    )
    .min(1, 'At least one theme is required'),
  thumbnail: z.object({
    horizontal: z.object({
      ratio1: z.object(
        {
          gradient: z.string().optional(),
          sourceLink: z
            .string()
            .min(1, 'Thumbnail (16:9) source link is required'),
        },
        { message: 'Thumbnail (16:9) is missing' },
      ),
      ratio3: z.object(
        {
          gradient: z.string().optional(),
          sourceLink: z
            .string()
            .min(1, 'Thumbnail for tv source link is required'),
        },
        { message: 'Thumbnail for tv is missing' },
      ),
      ratio4: z.object(
        {
          gradient: z.string().optional(),
          sourceLink: z
            .string()
            .min(1, 'Thumbnail (7:2) source link is required'),
        },
        { message: 'Thumbnail (7:2) is missing' },
      ),
    }),
    square: z
      .object({
        ratio1: z.object(
          {
            gradient: z.string().optional(),
            sourceLink: z
              .string()
              .min(1, 'Thumbnail (1:1) source link is required'),
          },
          { message: 'Thumbnail (1:1) is missing' },
        ),
      })
      .required(),
    vertical: z
      .object({
        ratio1: z.object({
          gradient: z.string().optional(),
          sourceLink: z
            .string()
            .min(1, 'Thumbnail (2:3) source link is required'),
        }),
      })
      .required(),
  }),
  title: z.string(),
  type: z.nativeEnum(ContentType).refine((val) => val === ContentType.MOVIE, {
    message: 'Type must be individual',
  }),
}) satisfies z.ZodType<
  Pick<
    Episode,
    | 'artistList'
    | 'genreList'
    | 'moods'
    | 'order'
    | 'selectedPeripheral'
    | 'slug'
    | 'status'
    | 'tags'
    | 'visionularHls'
    | 'visionularHlsH265'
  >
>;

export type PublishableMovie = z.infer<typeof publishableMovieSchema>;
