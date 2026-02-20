import { z } from 'zod';

// Base schemas for common types
export const thumbnailRatioSchema = z.object({
  gradient: z.string(),
  sourceLink: z.string(),
});

export const thumbnailHorizontalOrientationSchema = z.object({
  ratio1: thumbnailRatioSchema.optional(),
  ratio2: thumbnailRatioSchema.optional(),
  ratio3: thumbnailRatioSchema.optional(),
});

export const thumbnailVerticalOrientationSchema = z.object({
  ratio1: thumbnailRatioSchema.optional(),
});

export const thumbnailSquareOrientationSchema = z.object({
  ratio1: thumbnailRatioSchema.optional(),
});

export const thumbnailSchema = z.object({
  horizontal: thumbnailHorizontalOrientationSchema,
  square: thumbnailSquareOrientationSchema,
  vertical: thumbnailVerticalOrientationSchema,
});

export const visionularHlsSchema = z.object({
  hlsSourcelink: z.string().min(1, 'HLS source link is required'),
  rawMediaId: z.string().min(1, 'Raw media ID is required'),
  sourceLink: z.string().min(1, 'Source link is required'),
  status: z.string().min(1, 'Status is required'),
  visionularTaskId: z.string().min(1, 'Visionular task ID is required'),
});

// Helper for handling ID fields that could be string or number
export const flexibleNumberSchema = z.union([
  z.number(),
  z.string().transform((val) => Number(val)),
]);

// Helper for handling fields that could be string or object
export const flexibleStringSchema = z
  .union([
    z.string(),
    z.object({}).transform((val) => JSON.stringify(val)),
    z.array(z.any()).transform((val) => JSON.stringify(val)),
  ])
  .transform((val) => {
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  });
