import z from "zod";
import { Side } from "../../generated/prisma/enums";

export const SideSchema = z.enum(Object.values(Side) as [Side, ...Side[]]);

export const addNewGuestBodySchema = z.object({
  eventId: z.uuid().describe("Event ID is required"),
  name: z.string().min(1, "Name is required").max(50),
  mobile_number: z.string().min(1, "Mobile number is required").max(15),
  email: z.string().min(1, "Email is required").max(50),
  side: SideSchema.describe("Side is required (BRIDE or GROOM)"),
});

export const addNewGuestSchema = z.object({
  body: addNewGuestBodySchema,
});

export type AddNewGuestDto = z.infer<typeof addNewGuestBodySchema>;
