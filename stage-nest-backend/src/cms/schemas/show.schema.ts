import { z } from 'zod';

import { thumbnailSchema, visionularHlsSchema } from './base.schema';
import { Dialect } from '@app/common/enums/app.enum';
import {
  ContentStatus,
  MediaItem,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';

// Media item thumbnail schema
const mediaItemThumbnailSchema = z.object({
  horizontal: z.object({
    sourceLink: z.string().min(1, 'Trailer/Clip thumbnail is required'),
  }),
  square: z.object({ sourceLink: z.string() }),
  vertical: z.object({ sourceLink: z.string() }),
});

// Subtitle schema
const subtitleSchema = z.object({
  en: z.string(),
  hin: z.string(),
});

export const mediaItemSchema = z.object({
  description: z.string().optional(),
  duration: z
    .number()
    .min(0, 'Trailer duration must be non-negative')
    .refine((val) => Number.isInteger(val), {
      message: 'Trailer duration must be an integer',
    }),
  hlsSourceLink: z.string(),
  id: z.number(),
  mediaType: z.nativeEnum(PeripheralMediaType),
  rawMediaId: z.string(),
  selectedPeripheralStatus: z.boolean(),
  sourceLink: z.string(),
  subtitle: subtitleSchema,
  thumbnail: mediaItemThumbnailSchema,
  title: z.string().min(1, 'Trailer title is required'),
  type: z.nativeEnum(PeripheralTypeEnum),
  viewCount: z.number(),
  visionularHls: visionularHlsSchema.refine(
    (data) => data.status === 'succeeded',
    {
      message: 'Trailer is not transcoded successfully yet',
    },
  ),
  visionularHlsH265: visionularHlsSchema.refine(
    (data) => data.status === 'succeeded',
    {
      message: 'Trailer H265 version is not transcoded successfully yet',
    },
  ),
  visionularHlsH265History: z.array(z.string()),
  visionularHlsHistory: z.array(z.string()),
}) satisfies z.ZodType<MediaItem>;

// Season schema with publishable validation rules
export const publishableSeasonSchema = z.object({
  description: z
    .string()
    .min(1, 'Season description is required, minimum 1 characters')
    .max(300, 'Season description must be less than 300 characters'),
  title: z.string().min(1, 'Season title is required'),
});

export const validActiveSeasonSchema = publishableSeasonSchema
  .omit({
    description: true,
  })
  .extend({
    description: z.string().min(1, 'Season description is required'),
  });

export const publishableShowSchema = z.object({
  allThumbnails: z
    .array(thumbnailSchema)
    .min(1, 'At least one thumbnail is required'),
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
    .min(1, 'At least one artist is required'),
  complianceList: z
    .array(
      z.object({
        id: z.number().min(1, 'Compliance ID is required'),
        name: z.string().min(1, 'Compliance name is required'),
      }),
    )
    .min(1, 'At least one compliance item is required'),
  complianceRating: z.string().min(1, 'Compliance rating is required'),
  description: z
    .string()
    .min(1, 'Show description is required')
    .max(300, 'Show description must be less than 300 characters'),
  descriptorTags: z
    .array(
      z.object({
        id: z.number().min(1, 'Descriptor tag ID is required'),
        name: z.string().min(1, 'Descriptor tag name is required'),
      }),
    )
    .min(1, 'At least one descriptor tag is required'),
  episodeCount: z.number().min(0, 'Episode count must be non-negative'),
  genreList: z
    .array(
      z.object({
        id: z.number().min(1, 'Genre ID is required'),
        name: z.string().min(1, 'Genre name is required'),
      }),
    )
    .min(1, 'At least one genre is required'),
  isExclusive: z.number(),
  isNewContent: z.boolean(),
  isPopularContent: z.boolean(),
  isPremium: z.boolean(),
  isScheduled: z.boolean(),
  language: z.nativeEnum(Dialect),
  mediaList: z.array(z.any()).refine(
    (mediaItems) => {
      return mediaItems.every((item) => {
        if (item.mediaType === PeripheralMediaType.COMING_SOON) return true;
        const result = mediaItemSchema.safeParse(item);
        return result.success;
      });
    },
    {
      message: 'Invalid trailer',
    },
  ),
  metaDescription: z.string().min(1, 'Meta description is required'),
  moods: z
    .array(
      z.object({
        id: z.number().min(1, 'Mood ID is required'),
        name: z.string().min(1, 'Mood name is required'),
      }),
    )
    .optional(),
  plotKeywords: z.array(z.string()).optional(),
  primaryDialect: z.nativeEnum(Dialect, {
    errorMap: (issue) => {
      switch (issue.code) {
        case 'invalid_type':
          if (issue.received === 'undefined') {
            return { message: 'Primary dialect is missing' };
          }
          return { message: 'Primary dialect must be a valid dialect' };
        default:
          return { message: 'Invalid primary dialect' };
      }
    },
  }),
  selectedPeripheral: mediaItemSchema.omit({ id: true }),
  slug: z.string().min(1, 'Slug is required'),
  status: z.nativeEnum(ContentStatus),
  subGenreList: z
    .array(
      z.object({
        id: z.number().min(1, 'Sub-genre ID is required'),
        name: z.string().min(1, 'Sub-genre name is required'),
      }),
    )
    .min(1, 'At least one sub-genre is required'),
  targetAudience: z.array(z.string()).optional(),
  themes: z
    .array(
      z.object({
        id: z.number().min(1, 'Theme ID is required'),
        name: z.string().min(1, 'Theme name is required'),
      }),
    )
    .optional(),
  title: z.string().min(1, 'Title is required'),
});

export const validActiveShowSchema = publishableShowSchema
  .omit({
    allThumbnails: true,
    artistList: true,
    complianceList: true,
    complianceRating: true,
    description: true,
    descriptorTags: true,
    isPopularContent: true,
    isScheduled: true,
    mediaList: true,
    primaryDialect: true,
    selectedPeripheral: true,
    subGenreList: true,
  })
  .extend({
    allThumbnails: z.array(thumbnailSchema).optional(),
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
    complianceList: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
    complianceRating: z.string().optional(),
    description: z.string().min(1, 'Show description is required'),
    descriptorTags: z
      .array(
        z.object({
          id: z.number().min(1, 'Descriptor tag ID is required'),
          name: z.string().min(1, 'Descriptor tag name is required'),
        }),
      )
      .optional(),
    isPopularContent: z.boolean().optional(),
    isScheduled: z.boolean().optional(),
    mediaList: z.array(z.any()).refine((mediaItems) => {
      const errors: string[] = [];
      mediaItems.forEach((item, index) => {
        if (item.mediaType !== PeripheralMediaType.COMING_SOON) {
          const result = mediaItemSchema
            .omit({
              rawMediaId: true,
              subtitle: true,
              visionularHls: true,
              visionularHlsH265: true,
              visionularHlsH265History: true,
              visionularHlsHistory: true,
            })
            .extend({
              rawMediaId: z.string().optional(),
              subtitle: subtitleSchema.optional(),
              visionularHls: visionularHlsSchema.omit({ rawMediaId: true }),
              visionularHlsH265: visionularHlsSchema.omit({
                rawMediaId: true,
              }),
            })
            .safeParse(item);
          if (!result.success) {
            const errorMessages = result.error.issues.map(
              (issue) =>
                `Item ${index + 1}: ${issue.path.join('.')} - ${issue.message}`,
            );
            errors.push(...errorMessages);
          }
        }
      });
      return {
        message: errors.length > 0 ? errors.join('; ') : 'Invalid trailer',
      };
    }),
    primaryDialect: z
      .nativeEnum(Dialect, {
        errorMap: (issue) => {
          switch (issue.code) {
            case 'invalid_type':
              if (issue.received === 'undefined') {
                return { message: 'Primary dialect is missing' };
              }
              return { message: 'Primary dialect must be a valid dialect' };
            default:
              return { message: 'Invalid primary dialect' };
          }
        },
      })
      .optional(),
    selectedPeripheral: mediaItemSchema
      .omit({
        id: true,
        mediaType: true,
        rawMediaId: true,
        selectedPeripheralStatus: true,
        visionularHlsH265History: true,
        visionularHlsHistory: true,
      })
      .partial({
        subtitle: true,
      })
      .extend({
        rawMediaId: z.string().optional(),
        visionularHls: visionularHlsSchema.omit({ rawMediaId: true }),
        visionularHlsH265: visionularHlsSchema.omit({ rawMediaId: true }),
      }),
    subGenreList: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      )
      .optional(),
  });

// Type exports
export type PublishableShow = z.infer<typeof publishableShowSchema>;
export type PublishableSeason = z.infer<typeof publishableSeasonSchema>;
