import z from "zod";

export const generateS3PresignedUploadURLBodySchema = z.object({
  object_key: z.string().trim(),
  mime_type: z.string().trim(),
});

export const generateS3PresignedUploadURLSchema = z.object({
  body: generateS3PresignedUploadURLBodySchema,
});

export type GenerateS3PresignedUploadURLDto = z.infer<
  typeof generateS3PresignedUploadURLBodySchema
>;

export const generateS3PresignedViewURLBodySchema = z.object({
  object_key: z.string().trim(),
});

export const generateS3PresignedViewURLSchema = z.object({
  body: generateS3PresignedViewURLBodySchema,
});

export type GenerateS3PresignedViewURLDto = z.infer<
  typeof generateS3PresignedViewURLBodySchema
>;
