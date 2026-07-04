import z from "zod";

export const getAllUserWeddingsQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
});

export const getAllUserWeddingsSchema = z.object({
  query: getAllUserWeddingsQuerySchema,
});

export type GetAllUserWeddingsDto = z.infer<
  typeof getAllUserWeddingsQuerySchema
>;

export const addNewWeddingBodySchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100)
    .describe("Example: John and Jane's Wedding"),
  bride_name: z
    .string()
    .min(1, "Bride name is required")
    .max(50)
    .describe("Example: Jane Doe"),
  groom_name: z
    .string()
    .min(1, "Groom name is required")
    .max(50)
    .describe("Example: John Smith"),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2}))?$/,
      "Invalid date format. Please use YYYY-MM-DD or ISO 8601 format (e.g., 2026-10-15)",
    )
    .describe("Example: 2026-10-15"),
  venue: z
    .string()
    .min(1, "Venue is required")
    .max(200)
    .describe("Example: The Grand Hotel, New York"),
  city: z
    .string()
    .min(1, "City is required")
    .max(50)
    .describe("Example: New York"),
  message: z
    .string()
    .optional()
    .describe("Example: We can't wait to celebrate with you!"),
});

export const addNewWeddingSchema = z.object({
  body: addNewWeddingBodySchema,
});

export type AddNewWeddingDto = z.infer<typeof addNewWeddingBodySchema>;

export const getUserWeddingParamsSchema = z.object({
  id: z.uuid().describe("Wedding ID is required"),
});

export const getUserWeddingSchema = z.object({
  params: getUserWeddingParamsSchema,
});

export type GetUserWeddingDto = z.infer<typeof getUserWeddingParamsSchema>;

export const editWeddingSchema = z.object({
  params: getUserWeddingParamsSchema,
  body: addNewWeddingBodySchema.partial(),
});

export type EditWeddingDto = z.infer<typeof editWeddingSchema>;
