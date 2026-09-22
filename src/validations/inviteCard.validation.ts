import z from "zod";
import { CardSource, PhotoPlacement } from "../../generated/prisma/enums";

export const CardSourceSchema = z.enum(
  Object.values(CardSource) as [CardSource, ...CardSource[]],
);

// Only these two involve generating; an UPLOAD card is the couple's own image
const GeneratedCardSourceSchema = z.enum([
  CardSource.PRESETS,
  CardSource.EXAMPLE,
]);

export const PhotoPlacementSchema = z.enum(
  Object.values(PhotoPlacement) as [PhotoPlacement, ...PhotoPlacement[]],
);

export const getInviteCardsByWeddingParamsSchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
});

export const getInviteCardsByWeddingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(5).optional(),
});

export type GetInviteCardsByWeddingQueryDto = z.infer<
  typeof getInviteCardsByWeddingQuerySchema
>;

export const getAiInvitecardsByWeddingSchema = z.object({
  params: getInviteCardsByWeddingParamsSchema,
  query: getInviteCardsByWeddingQuerySchema,
});

export type GetInviteCardsByWeddingParamsDto = z.infer<
  typeof getInviteCardsByWeddingParamsSchema
>;

export const updateInviteCardParamsSchema = z.object({
  id: z.uuid().describe("AI invite card ID is required"),
});

export const inviteCardGenerationStatusParamsSchema = z.object({
  id: z.uuid().describe("AI invite card ID is required"),
});

export const getInviteCardGenerationStatusSchema = z.object({
  params: inviteCardGenerationStatusParamsSchema,
});

export type GetInviteCardGenerationStatusParamsDto = z.infer<
  typeof inviteCardGenerationStatusParamsSchema
>;

export const updateEventInviteFormatBodySchema = z.object({
  card_source: CardSourceSchema.optional().describe(
    "Where the invite card comes from: PRESETS, EXAMPLE or UPLOAD",
  ),
  photo_type: z
    .enum(["couple", "bride", "groom"])
    .optional()
    .nullable()
    .describe("Image type (couple, bride, or groom)"),
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
  illustration_style: z
    .string()
    .optional()
    .nullable()
    .describe("Illustration style for generating AI couple photo"),
  couple_raw_image_key: z
    .string()
    .optional()
    .nullable()
    .describe("Couple raw image key for the AI invite card"),
  photo_placement: PhotoPlacementSchema.optional()
    .nullable()
    .describe("How the couple photo should be used in the design"),
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

export const updateInviteCardSchema = z.object({
  params: updateInviteCardParamsSchema,
  body: updateEventInviteFormatBodySchema,
});

export type UpdateInviteCardDto = z.infer<typeof updateInviteCardSchema>;

export const generateInviteCardImageBodySchema = z
  .object({
    eventId: z.uuid().describe("Event ID is required"),
    card_source: GeneratedCardSourceSchema.optional()
      .default(CardSource.PRESETS)
      .describe("How to generate the card: from PRESETS or from an EXAMPLE"),
    photo_type: z
      .enum(["couple", "bride", "groom"])
      .optional()
      .describe("Image type (couple, bride, or groom)"),
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
    reference_image: z
      .string()
      .optional()
      .nullable()
      .describe("Reference image"),
    generated_image: z
      .string()
      .optional()
      .nullable()
      .describe("Generated image"),
    illustration_style: z
      .string()
      .optional()
      .nullable()
      .describe("Illustration style for generating AI couple photo"),
    couple_raw_image_key: z
      .string()
      .min(1, "Couple Raw image key is required")
      .trim()
      .optional()
      .nullable()
      .describe(
        "couple Raw image key or path of the image for the AI invite card",
      ),
    photo_placement: PhotoPlacementSchema.optional()
      .nullable()
      .describe("How the couple photo should be used in the design"),
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
  })
  .superRefine((data, ctx) => {
    if (
      data.card_source === "EXAMPLE" &&
      (!data.reference_image || data.reference_image.trim() === "")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Reference image is required when card_source is EXAMPLE",
        path: ["reference_image"],
      });
    }

    // In EXAMPLE mode the photo can either be swapped onto the reference's figures or
    // added as a portrait inset — the two produce very different cards, so ask.
    if (
      data.card_source === "EXAMPLE" &&
      data.couple_raw_image_key &&
      !data.photo_placement
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Choose how the couple photo should be used when card_source is EXAMPLE",
        path: ["photo_placement"],
      });
    }

    if (data.card_source === "PRESETS") {
      const requiredManualFields = [
        "design_preset",
        "texture_emulation",
        "typography_pairing",
        "metallic_accents",
        "negative_space",
        "monogram_style",
        "text_alignment",
        "edge_styling",
      ] as const;

      for (const field of requiredManualFields) {
        if (!data[field] || data[field]?.trim() === "") {
          ctx.addIssue({
            code: "custom",
            message: `${field} is required when card_source is PRESETS`,
            path: [field],
          });
        }
      }
    }
  });

export const generateInviteCardImageSchema = z.object({
  body: generateInviteCardImageBodySchema,
});

export type GenerateInviteCardImageDto = z.infer<
  typeof generateInviteCardImageBodySchema
>;
