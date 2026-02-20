import { z } from "zod";

export const videoQcFormSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID is required")
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "Project ID must contain only alphanumeric characters and hyphens"
    ),
  videoFile: z.instanceof(File).optional(),
});

export type VideoQcFormValues = z.infer<typeof videoQcFormSchema>;
