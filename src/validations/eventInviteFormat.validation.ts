import z from "zod";

export const getEventInviteFormatsByWeddingParamsSchema = z.object({
  weddingId: z.uuid().describe("Event ID is required"),
});

export const getEventInviteFormatsByWeddingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
});

export type GetEventInviteFormatsByWeddingQueryDto = z.infer<
  typeof getEventInviteFormatsByWeddingQuerySchema
>;

export const getEventInviteFormatsByWeddingSchema = z.object({
  params: getEventInviteFormatsByWeddingParamsSchema,
  query: getEventInviteFormatsByWeddingQuerySchema,
});

export type GetEventInviteFormatsByWeddingDto = z.infer<
  typeof getEventInviteFormatsByWeddingParamsSchema
>;

export const getEventInviteFormatByEventParamsSchema = z.object({
  eventId: z.uuid().describe("Event ID is required"),
});

export const getEventInviteFormatByeventSchema = z.object({
  params: getEventInviteFormatByEventParamsSchema,
});

export type GetEventInviteFormatByEventDto = z.infer<
  typeof getEventInviteFormatByEventParamsSchema
>;

export const updateEventInviteFormatParamsSchema = z.object({
  id: z.uuid().describe("Event Invite Format ID is required"),
});

export const updateEventInviteFormatBodySchema = z.object({
  dietary_preference: z
    .boolean()
    .default(false)
    .describe("Need to add dietary Preference"),
  song_request: z.boolean().default(false).describe("Need to add song request"),
  message: z.boolean().default(false).describe("Need to add message"),
  plus_ones: z.boolean().default(false).describe("Need to add plus ones"),
  first_reminder: z
    .boolean()
    .default(false)
    .describe("Need to add first reminder"),
  final_reminder: z
    .boolean()
    .default(false)
    .describe("Need to add final reminder"),
  raw_image: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Raw image for the RSVP"),
  generated_image: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Generated image for the RSVP"),
  illustration_style: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Illustration style for the RSVP"),
  illustration_theme: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Illustration theme for the RSVP"),
  photo_type: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Photo type for the RSVP"),
  bride_attire_style: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Bride attire style for the RSVP"),
  groom_attire_style: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("Groom attire style for the RSVP"),
});

export const updateEventInviteFormatSchema = z.object({
  params: updateEventInviteFormatParamsSchema,
  body: updateEventInviteFormatBodySchema,
});

export type UpdateEventInviteFormatDto = z.infer<
  typeof updateEventInviteFormatSchema
>;

export const getEventInviteFormatParamsSchema = z.object({
  id: z.uuid().describe("Event Invite Format ID is required"),
});

export const getEventInviteFormatSchema = z.object({
  params: getEventInviteFormatParamsSchema,
});

export type GetEventInviteFormatDto = z.infer<
  typeof getEventInviteFormatParamsSchema
>;

export const generateEventInviteFormatImageBodySchema = z.object({
  eventId: z.uuid().describe("Event ID is required"),
  rawImageKey: z
    .string()
    .min(1, "Raw image key is required")
    .trim()
    .describe("Raw image key or path of the image for the RSVP thumbnail"),
  photoType: z
    .enum(["couple", "bride", "groom"])
    .describe("Image type (couple, bride, or groom)"),
  illustrationStyle: z
    .string()
    .min(1, "Style ID is required")
    .describe("Style ID for the prompt"),
  attireId: z.string().optional().nullable().describe("Attire ID"),
  brideAttireId: z.string().optional().nullable().describe("Bride Attire ID"),
  groomAttireId: z.string().optional().nullable().describe("Groom Attire ID"),
  customStyleNote: z
    .string()
    .optional()
    .nullable()
    .describe("Custom style note"),
  illustrationTheme: z
    .string()
    .optional()
    .nullable()
    .describe("Theme for the prompt"),
});

export const generateEventInviteFormatImageSchema = z.object({
  body: generateEventInviteFormatImageBodySchema,
});

export type GenerateEventInviteFormatImageDto = z.infer<
  typeof generateEventInviteFormatImageBodySchema
>;
