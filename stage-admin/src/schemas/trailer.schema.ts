import { z } from "zod";

export const trailerFormSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID is required")
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "Project ID must contain only alphanumeric characters and hyphens"
    ),
  contentSlug: z.string().optional(),
  contentMetadata: z
    .object({
      title: z.string().optional(),
      genre: z.string().optional(),
      language: z.string().optional(),
      targetDuration: z.number().optional(),
    })
    .optional(),
  videoFile: z.instanceof(File).optional(),
});

export type TrailerFormValues = z.infer<typeof trailerFormSchema>;

export const generateTrailerSchema = z.object({
  rawMediaId: z.string().min(1, "Raw Media ID is required"),
  narrativeStyles: z.array(z.string()).optional(),
  targetDuration: z.number().min(15).max(180).optional(),
  contentMetadata: z
    .object({
      title: z.string().optional(),
      genre: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

export type GenerateTrailerFormValues = z.infer<typeof generateTrailerSchema>;
