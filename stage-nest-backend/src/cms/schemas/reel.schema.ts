import { z } from 'zod';

import {
  ReelType,
  ReelStatusEnum,
  ReelEntity,
} from '@app/common/entities/reel.entity';

const LanguageVariantPropertySchema = z.object({
  en: z.string(),
  hin: z.string(),
});
export const ReelStatusHistorySchema = z.object({
  status: z.nativeEnum(ReelStatusEnum),
  timestamp: z.date(),
});

export const ReelThumbnailSchema = z.object({
  ratio_9_16: LanguageVariantPropertySchema,
});

export const ReelSchema = z.object({
  _id: z.string(),
  content: z.string().nullable(),
  createdAt: z.date(),
  description: LanguageVariantPropertySchema,
  duration: z.number(),
  id: z.string(),
  reelType: z.nativeEnum(ReelType),
  status: z.nativeEnum(ReelStatusEnum),
  statusHistory: z.array(ReelStatusHistorySchema),
  thumbnail: ReelThumbnailSchema.nullable(),
  title: LanguageVariantPropertySchema,
  updatedAt: z.date(),
}) satisfies z.ZodType<
  Pick<
    ReelEntity,
    | 'description'
    | 'duration'
    | 'reelType'
    | 'status'
    | 'statusHistory'
    | 'thumbnail'
    | 'title'
  >
>;

export type Reel = z.infer<typeof ReelSchema>;
