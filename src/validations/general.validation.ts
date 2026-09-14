import z from "zod";

export const generateS3PresignedUploadURLBodySchema = z.object({
  object_key: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .describe("Requested key; the server stores it under users/<your id>/ and returns the final key"),
  mime_type: z.string().trim().min(1),
});

export const generateS3PresignedUploadURLSchema = z.object({
  body: generateS3PresignedUploadURLBodySchema,
});

export type GenerateS3PresignedUploadURLDto = z.infer<
  typeof generateS3PresignedUploadURLBodySchema
>;

export const generateS3PresignedViewURLBodySchema = z.object({
  object_key: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .describe("Your own upload, or a key saved on a record you own"),
});

export const generateS3PresignedViewURLSchema = z.object({
  body: generateS3PresignedViewURLBodySchema,
});

export type GenerateS3PresignedViewURLDto = z.infer<
  typeof generateS3PresignedViewURLBodySchema
>;
