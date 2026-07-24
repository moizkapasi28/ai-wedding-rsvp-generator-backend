import z from "zod";
import { Group, Side } from "../../generated/prisma/enums";

export const SideSchema = z.enum(Object.values(Side) as [Side, ...Side[]]);
export const GroupSchema = z.enum(Object.values(Group) as [Group, ...Group[]]);

export const getAllGuestsQuerySchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
  eventId: z.uuid().optional().describe("Event Id if need to filter by event"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  search: z.string().trim().optional().default("").describe("search keyword"),
  events: z
    .string()
    .optional()
    .transform((val) =>
      val
        ?.split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.uuid()).optional())
    .describe(
      "Comma-separated filter options: event ids (e.g. 'eventId1,eventId2')",
    ),
  sides: z
    .string()
    .optional()
    .transform((val) =>
      val
        ?.split(",")
        .map((f) => f.trim().toUpperCase())
        .filter(Boolean),
    )
    .pipe(z.array(SideSchema).optional())
    .describe(
      "Comma-separated filter options: sides (e.g. 'BRIDE,GROOM,BOTH')",
    ),
  groups: z
    .string()
    .optional()
    .transform((val) =>
      val
        ?.split(",")
        .map((f) => f.trim().toUpperCase())
        .filter(Boolean),
    )
    .pipe(z.array(GroupSchema).optional())
    .describe(
      "Comma-separated filter options: groups (e.g. 'FRIEND,RELATIVE,COLLEAGUE,EMPLOYEE,VIP')",
    ),
});

export const getAllGuestsSchema = z.object({
  query: getAllGuestsQuerySchema,
});

export type GetAllGuestsDto = z.infer<typeof getAllGuestsQuerySchema>;

export const addNewGuestBodySchema = z.object({
  eventIds: z.array(z.uuid()).min(1, "At least one event must be selected"),
  name: z.string().min(1, "Name is required").max(50),
  mobile_number: z.string().min(1, "Mobile number is required").max(15),
  email: z.string().min(1, "Email is required").max(50),
  side: SideSchema.describe("Side is required (BRIDE or GROOM)"),
  group: GroupSchema.describe(
    "Group is required (FRIEND or RELATIVE or COLLEAGUE or EMPLOYEE or VIP)",
  ),
  accomodation_required: z
    .boolean()
    .default(false)
    .describe("Is accomodation required for guest"),
  accomodation_address: z
    .string()
    .trim()
    .max(250, "Accomodation Address cannot be longer than 250 characters")
    .optional()
    .describe("Accomodation Address for the guest"),
  note: z
    .string()
    .trim()
    .max(100, "Note cannot be longer than 100 characters")
    .optional()
    .describe("Note for the guest"),
});

export const addNewGuestSchema = z.object({
  body: addNewGuestBodySchema,
});

export type AddNewGuestDto = z.infer<typeof addNewGuestBodySchema>;

export const getWeddingGuestParamsSchema = z.object({
  id: z.uuid().describe("Guest Id is required"),
});

export const getWeddingGuestSchema = z.object({
  params: getWeddingGuestParamsSchema,
});

export type GetWeddingGuestDto = z.infer<typeof getWeddingGuestParamsSchema>;

export const editWeddingGuestSchema = z.object({
  params: getWeddingGuestParamsSchema,
  body: addNewGuestBodySchema.partial(),
});

export type EditWeddingGuestDto = z.infer<typeof editWeddingGuestSchema>;

export const downloadGuestTemplateParamsSchema = z.object({
  id: z.uuid().describe("Guest Id is required"),
});

export const downloadGuestTemplateSchema = z.object({
  params: downloadGuestTemplateParamsSchema,
});

export const uploadGuestTemplateSchema = z.object({
  params: downloadGuestTemplateParamsSchema,
});

export type DownloadGuestTemplateDto = z.infer<
  typeof downloadGuestTemplateSchema
>;

export type UploadGuestTemplateDto = z.infer<
  typeof uploadGuestTemplateSchema
>;
