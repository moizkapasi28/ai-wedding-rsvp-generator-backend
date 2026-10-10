import z from "zod";
import { Group, Side } from "../../generated/prisma/enums";
import { normalizePhone } from "../lib/whatsapp";

export const SideSchema = z.enum(Object.values(Side) as [Side, ...Side[]]);
export const GroupSchema = z.enum(Object.values(Group) as [Group, ...Group[]]);

export const getAllGuestsQuerySchema = z.object({
  weddingId: z.uuid().describe("Wedding ID is required"),
  eventId: z.uuid().optional().describe("Event Id if need to filter by event"),
  page: z.coerce.number().int().min(1).default(1),
  // Capped: an unbounded limit would load every row with its relations
  limit: z.coerce.number().int().min(1).max(100).default(10),
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
  inviteSent: z
    .enum(["sent", "not_sent"])
    .optional()
    .describe(
      "Only guests with an invite that was / wasn't sent (for the filtered events, if any)",
    ),
});

export const getAllGuestsSchema = z.object({
  query: getAllGuestsQuerySchema,
});

export type GetAllGuestsDto = z.infer<typeof getAllGuestsQuerySchema>;

const guestBodyFields = z.object({
  eventIds: z.array(z.uuid()).min(1, "At least one event must be selected"),
  name: z.string().min(1, "Name is required").max(50),
  mobile_number: z
    .string()
    .min(1, "Mobile number is required")
    .max(15)
    // Same rule the WhatsApp links use, so every saved guest can be messaged
    .refine((value) => normalizePhone(value) !== null, {
      message: "Enter a valid mobile number (at least 8 digits)",
    }),
  // Optional: blank from the form or Excel import is stored as null; anything else must
  // be an email address, the same rule the frontend form applies
  email: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((value) => value || null)
    .pipe(z.email("Enter a valid email address").nullable()),
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

// A guest who needs a room needs an address to stay at. The frontend form requires it too,
// but the Excel import and direct API calls don't go through that form. On a partial edit
// the rule only applies when the request carries the address field as well.
const requireAccomodationAddress =
  (partial: boolean) =>
  (
    guest: { accomodation_required?: boolean; accomodation_address?: string },
    ctx: z.RefinementCtx,
  ) => {
    if (!guest.accomodation_required) return;
    if (partial && guest.accomodation_address === undefined) return;
    if (!guest.accomodation_address) {
      ctx.addIssue({
        code: "custom",
        path: ["accomodation_address"],
        message:
          "Accommodation address is required when the guest needs accommodation",
      });
    }
  };

export const addNewGuestBodySchema = guestBodyFields.superRefine(
  requireAccomodationAddress(false),
);

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
  body: guestBodyFields
    .partial()
    .superRefine(requireAccomodationAddress(true)),
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

export type UploadGuestTemplateDto = z.infer<typeof uploadGuestTemplateSchema>;

// BullMQ job ids are incrementing numbers, not UUIDs
export const getJobStatusParamsSchema = z.object({
  jobId: z.string().min(1).describe("Job Id is required"),
});

export const getJobStatusSchema = z.object({
  params: getJobStatusParamsSchema,
});

export type GetJobStatusDto = z.infer<typeof getJobStatusParamsSchema>;

export const inviteParamsSchema = z.object({
  inviteId: z.uuid().describe("Invite Id is required"),
});

export const markInviteSentSchema = z.object({
  params: inviteParamsSchema,
});

export type InviteParamsDto = z.infer<typeof inviteParamsSchema>;

export const getWhatsAppInvitesQuerySchema = z
  .object({
    eventId: z.uuid().optional().describe("All invites for this event"),
    guestId: z.uuid().optional().describe("All invites for this guest"),
  })
  .refine((query) => Boolean(query.eventId) !== Boolean(query.guestId), {
    message: "Provide either eventId or guestId",
  });

export const getWhatsAppInvitesSchema = z.object({
  query: getWhatsAppInvitesQuerySchema,
});

export type GetWhatsAppInvitesDto = z.infer<typeof getWhatsAppInvitesQuerySchema>;

const getDueRemindersQuerySchema = z.object({
  eventId: z.uuid().describe("Event Id is required"),
});

export const getDueRemindersSchema = z.object({
  query: getDueRemindersQuerySchema,
});

export type GetDueRemindersDto = z.infer<typeof getDueRemindersQuerySchema>;

export const markReminderSentSchema = z.object({
  params: inviteParamsSchema,
  body: z.object({
    reminder: z.enum(["FIRST", "FINAL"]).describe("Which reminder was sent"),
  }),
});

export type MarkReminderSentDto = z.infer<typeof markReminderSentSchema>;

// The undo is a DELETE, which carries no body, so the reminder kind is a query parameter
export const unmarkReminderSentSchema = z.object({
  params: inviteParamsSchema,
  query: z.object({
    reminder: z.enum(["FIRST", "FINAL"]).describe("Which reminder to undo"),
  }),
});

export type UnmarkReminderSentDto = z.infer<typeof unmarkReminderSentSchema>;
