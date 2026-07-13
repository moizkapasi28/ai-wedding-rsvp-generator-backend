import z from "zod";
import { EventSide } from "../../generated/prisma/enums";

export const EventSideSchema = z.enum(
  Object.values(EventSide) as [EventSide, ...EventSide[]],
);

export const getAllWeddingEventsQuerySchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
});

export const getAllWeddingEventsSchema = z.object({
  query: getAllWeddingEventsQuerySchema,
});

export type GetAllWeddingEventsDto = z.infer<
  typeof getAllWeddingEventsQuerySchema
>;

export const addNewWeddingEventBodySchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required").max(200),
  eventSide: EventSideSchema.describe(
    "Side is required (BRIDE or GROOM or BOTH)",
  ),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2}))?$/,
      "Invalid date format. Please use YYYY-MM-DD or ISO 8601 format (e.g., 2026-10-15)",
    )
    .describe("Example: 2026-10-15"),
  time: z
    .string()
    .regex(
      /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Example: 12:30",
    )
    .describe("Example: 12:30"),
  venue: z
    .string()
    .min(1, "Venue is required")
    .max(200)
    .describe("Example: The Grand Hotel, New York"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(200)
    .describe("Example: 123 Main St, New York"),
  city: z
    .string()
    .min(1, "City is required")
    .max(50)
    .describe("Example: New York"),
  latitude: z
    .string()
    .min(1, "Latitude is required")
    .max(50)
    .optional()
    .describe("Example: 40.7128"),
  longitude: z
    .string()
    .min(1, "Longitude is required")
    .max(50)
    .optional()
    .describe("Example: 40.7128"),
});

export const addNewWeddingEventSchema = z.object({
  body: addNewWeddingEventBodySchema,
});

export type AddNewWeddingEventDto = z.infer<
  typeof addNewWeddingEventBodySchema
>;

export const getWeddingEventParamsSchema = z.object({
  id: z.uuid().describe("Wedding ID is required"),
});

export const getWeddingEventSchema = z.object({
  params: getWeddingEventParamsSchema,
});

export type GetWeddingEventDto = z.infer<typeof getWeddingEventParamsSchema>;

export const editWeddingEventSchema = z.object({
  params: getWeddingEventParamsSchema,
  body: addNewWeddingEventBodySchema.partial().omit({ weddingId: true }),
});

export type EditWeddingEventDto = z.infer<typeof editWeddingEventSchema>;

export const deleteWeddingEventSchema = z.object({
  params: getWeddingEventParamsSchema,
});

export type DeleteWeddingEventDto = z.infer<typeof getWeddingEventParamsSchema>;
