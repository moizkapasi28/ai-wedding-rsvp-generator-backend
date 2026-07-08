import z from "zod";
import { Side } from "../../generated/prisma/enums";

export const SideSchema = z.enum(Object.values(Side) as [Side, ...Side[]]);

export const getAllGuestsQuerySchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
  eventId: z.uuid().optional().describe("Event Id if need to filter by event"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
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
