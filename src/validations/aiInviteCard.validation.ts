import z from "zod";
import { GenerationMode } from "../../generated/prisma/enums";

export const GenerationModeSchema = z.enum(
  Object.values(GenerationMode) as [GenerationMode, ...GenerationMode[]],
);

export const getAiInviteCardsByWeddingParamsSchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
});

export const getAiInviteCardsByWeddingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
});

export type GetAiInviteCardsByWeddingQueryDto = z.infer<
  typeof getAiInviteCardsByWeddingQuerySchema
>;

export const getAiInvitecardsByWeddingSchema = z.object({
  params: getAiInviteCardsByWeddingParamsSchema,
  query: getAiInviteCardsByWeddingQuerySchema,
});

export type GetAiInviteCardsByWeddingParamsDto = z.infer<
  typeof getAiInviteCardsByWeddingParamsSchema
>;

export const updateAiInviteCardParamsSchema = z.object({
  id: z.uuid().describe("AI invite card ID is required"),
});

export const updateEventInviteFormatBodySchema = z.object({
  generation_mode: GenerationModeSchema.optional()
    .default("EXAMPLE")
    .describe("Generation mode of AI invite card"),
  design_preset: z.string().optional().nullable().describe("Design preset"),
  texture_emulation: z
    .string()
    .optional()
    .nullable()
    .describe("Texture emulation"),
  typography_pairing: z
    .string()
    .optional()
    .nullable()
    .describe("Typography pairing"),
  metallic_accents: z
    .string()
    .optional()
    .nullable()
    .describe("Metallic accents"),
  negative_space: z.string().optional().nullable().describe("Negative space"),
  monogram_style: z.string().optional().nullable().describe("Monogram style"),
  text_alignment: z.string().optional().nullable().describe("Text alignment"),
  edge_styling: z.string().optional().nullable().describe("Edge styling"),
  additional_details: z
    .string()
    .optional()
    .nullable()
    .describe("Additional details"),
  custom_message: z.string().optional().nullable().describe("Custom message"),
  reference_image: z.string().optional().nullable().describe("Reference image"),
  generated_image: z.string().optional().nullable().describe("Generated image"),
  bride_image: z.string().optional().nullable().describe("Bride image"),
  groom_image: z.string().optional().nullable().describe("Groom image"),
  bride_attire_style: z
    .string()
    .optional()
    .nullable()
    .describe("Bride attire style"),
  groom_attire_style: z
    .string()
    .optional()
    .nullable()
    .describe("Groom attire style"),
  generated_invite_image_url: z
    .string()
    .optional()
    .nullable()
    .describe("Generated invite image URL"),
});

export const updateAiInviteCardSchema = z.object({
  params: updateAiInviteCardParamsSchema,
  body: updateEventInviteFormatBodySchema,
});

export type UpdateAiInviteCardDto = z.infer<typeof updateAiInviteCardSchema>;

export const generateAIInviteCardImageBodySchema = z.object({
  eventId: z.uuid().describe("Event ID is required"),
});

export const generateAIInviteCardImageSchema = z.object({
  body: generateAIInviteCardImageBodySchema,
});

export type GenerateAIInviteCardImageDto = z.infer<
  typeof generateAIInviteCardImageSchema
>;
