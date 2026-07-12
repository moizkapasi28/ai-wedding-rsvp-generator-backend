import z from "zod";

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
  dietaryPreference: z
    .boolean()
    .default(false)
    .describe("Need to add dietary Preference"),
  songRequest: z.boolean().default(false).describe("Need to add song request"),
  message: z.boolean().default(false).describe("Need to add message"),
  plusOnes: z.boolean().default(false).describe("Need to add plus ones"),
  firstReminder: z
    .boolean()
    .default(false)
    .describe("Need to add first reminder"),
  finalReminder: z
    .boolean()
    .default(false)
    .describe("Need to add final reminder"),
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
  illustrationStyle: z
    .string()
    .min(1, "Illustration style is required")
    .trim()
    .default(
      "Studio Ghibli-inspired anime illustration, soft painterly style, warm pastel color palette, hand-drawn watercolor textures, whimsical and gentle atmosphere, lush detailed backgrounds, soft natural lighting, delicate linework, dreamy nostalgic mood, highly detailed, 2D animation style",
    )
    .describe("Illustration style"),
  negativePrompt: z
    .string()
    .min(1, "Negative prompt is required")
    .trim()
    .default(
      "photorealistic, 3D render, hyperrealistic, harsh shadows, sharp digital edges, cyberpunk, dark and gritty, low quality, blurry, distorted faces, extra limbs",
    )
    .describe("Negative prompt"),
});

export const generateEventInviteFormatImageSchema = z.object({
  body: generateEventInviteFormatImageBodySchema,
});

export type GenerateEventInviteFormatImageDto = z.infer<
  typeof generateEventInviteFormatImageBodySchema
>;
