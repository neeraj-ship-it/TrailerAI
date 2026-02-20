import z from 'zod';

import { visionularHlsSchema } from './base.schema';
import { Dialect } from '@app/common/enums/app.enum';
import {
  ContentStatus,
  Contents,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';

const peripheralThumbnailSchema = z.object({
  horizontal: z.object({
    sourceLink: z
      .string()
      .min(1, 'Content Schema: Horizontal thumbnail source link is required'),
  }),
});

export const contentThumbnailSchema = z.object({
  horizontal: z.object({
    ratio_16_9: z.object({
      gradient: z.string(),
      sourceLink: z
        .string()
        .min(1, 'Content Schema: Episode thumbnail (16:9) is required'),
    }),
    ratio_7_2: z.object({
      gradient: z.string(),
      sourceLink: z
        .string()
        .min(1, 'Content Schema: Episode thumbnail (7:2) is required'),
    }),
    ratio_tv: z.object({
      gradient: z.string(),
      sourceLink: z.string(),
    }),
  }),
  square: z.object({
    ratio_1_1: z.object({
      gradient: z.string(),
      sourceLink: z
        .string()
        .min(1, 'Content Schema: Episode thumbnail (1:1) is required'),
    }),
  }),
  vertical: z.object({
    ratio_2_3: z.object({
      gradient: z.string(),
      sourceLink: z
        .string()
        .min(1, 'Content Schema: Episode thumbnail (2:3) is required'),
    }),
  }),
});

export const publishableContentSchema = z.object({
  allThumbnails: z
    .array(contentThumbnailSchema)
    .min(1, { message: 'Content Schema: At least one thumbnail is required' }),
  artistList: z
    .array(z.object({}))
    .min(1, { message: 'Content Schema: At least one artist is required' }),
  complianceList: z
    .array(
      z.object({
        id: z
          .number()
          .min(1, { message: 'Content Schema: Compliance ID is required' }),
        name: z
          .string()
          .min(1, { message: 'Content Schema: Compliance name is required' }),
      }),
    )
    .min(1, {
      message: 'Content Schema: At least one compliance item is required',
    }),
  complianceRating: z
    .string()
    .min(1, { message: 'Content Schema: Compliance rating is required' }),
  description: z
    .string()
    .min(1, { message: 'Content Schema: Show description is required' })
    .max(300, {
      message:
        'Content Schema: Show description must be less than 300 characters',
    }),
  descriptorTags: z
    .array(
      z.object({
        id: z
          .number()
          .min(1, { message: 'Content Schema: Descriptor tag ID is required' }),
        name: z.string().min(1, {
          message: 'Content Schema: Descriptor tag name is required',
        }),
      }),
    )
    .min(1, {
      message: 'Content Schema: At least one descriptor tag is required',
    }),
  dialect: z.nativeEnum(Dialect),
  episodeCount: z
    .number()
    .min(0, { message: 'Content Schema: Episode count must be non-negative' }),
  genres: z
    .array(
      z.object({
        id: z
          .number()
          .min(1, { message: 'Content Schema: Genre ID is required' }),
        name: z
          .string()
          .min(1, { message: 'Content Schema: Genre name is required' }),
      }),
    )
    .min(1, {
      message: 'Content Schema: At least one genre is required',
    }),
  isExclusive: z.boolean(),
  isNewContent: z.boolean(),
  isPopularContent: z.boolean(),
  isPremium: z.boolean(),
  isScheduled: z.boolean(),
  metaDescription: z
    .string()
    .min(1, { message: 'Content Schema: Meta description is required' }),
  moods: z
    .array(
      z.object({
        id: z
          .number()
          .min(1, { message: 'Content Schema: Mood ID is required' }),
        name: z
          .string()
          .min(1, { message: 'Content Schema: Mood name is required' }),
      }),
    )
    .min(1, { message: 'Content Schema: At least one mood is required' }),
  plotKeywords: z.array(z.string()).min(1, {
    message: 'Content Schema: At least one plot keyword is required',
  }),
  primaryDialect: z.nativeEnum(Dialect, {
    errorMap: (issue) => {
      switch (issue.code) {
        case 'invalid_type':
          if (issue.received === 'undefined') {
            return { message: 'Content Schema: Primary dialect is missing' };
          }
          return {
            message: 'Content Schema: Primary dialect must be a valid dialect',
          };
        default:
          return { message: 'Content Schema: Invalid primary dialect' };
      }
    },
  }),
  selectedPeripheral: z.object({
    description: z.string().optional(),
    duration: z
      .number()
      .min(0, {
        message: 'Content Schema: Trailer duration must be non-negative',
      })
      .refine((val) => Number.isInteger(val), {
        message: 'Content Schema: Trailer duration must be an integer',
      }),
    hlsSourceLink: z.string(),
    rawMediaId: z
      .string()
      .min(1, { message: 'Content Schema: Raw media ID is required' }),
    sourceLink: z.string(),
    thumbnail: peripheralThumbnailSchema,
    title: z
      .string()
      .min(1, { message: 'Content Schema: Trailer title is required' }),
    type: z.nativeEnum(PeripheralTypeEnum),
    viewCount: z.number(),
    visionularHls: visionularHlsSchema.refine(
      (data) => data.status === 'succeeded',
      {
        message: 'Content Schema: Trailer is not transcoded successfully yet',
      },
    ),
    visionularHlsH265: visionularHlsSchema.refine(
      (data) => data.status === 'succeeded',
      {
        message:
          'Content Schema: Trailer H265 version is not transcoded successfully yet',
      },
    ),
  }),
  slug: z.string().min(1, { message: 'Content Schema: Slug is required' }),
  status: z.nativeEnum(ContentStatus),
  targetAudience: z
    .array(z.string())
    .min(1, { message: 'Content Schema: Target audience is required' }),
  themes: z
    .array(
      z.object({
        id: z
          .number()
          .min(1, { message: 'Content Schema: Theme ID is required' }),
        name: z
          .string()
          .min(1, { message: 'Content Schema: Theme name is required' }),
      }),
    )
    .min(1, { message: 'Content Schema: At least one theme is required' }),
  title: z.string().min(1, { message: 'Content Schema: Title is required' }),
}) satisfies z.ZodType<
  Pick<
    Contents,
    | 'allThumbnails'
    | 'description'
    | 'title'
    | 'targetAudience'
    | 'themes'
    | 'plotKeywords'
    | 'primaryDialect'
    | 'status'
    | 'slug'
    | 'genres'
  >
>;

export type PublishableContent = z.infer<typeof publishableContentSchema>;

export const comingSoonContentSchema = z.object({
  allThumbnails: z.array(contentThumbnailSchema),
  description: z
    .string()
    .min(1, { message: 'Coming Soon Content Schema: Description is required' }),
  status: z.nativeEnum(ContentStatus),
  title: z
    .string()
    .min(1, { message: 'Coming Soon Content Schema: Title is required' }),
}) satisfies z.ZodType<
  Pick<Contents, 'allThumbnails' | 'description' | 'title' | 'status'>
>;

export type ComingSoonContent = z.infer<typeof comingSoonContentSchema>;
