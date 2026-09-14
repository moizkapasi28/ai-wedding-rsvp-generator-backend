import z from "zod";
import { Dietary, Status } from "../../generated/prisma/enums";

const rsvpTokenParamsSchema = z.object({
  token: z.uuid().describe("Invite token from the event's RSVP link"),
});

export const getRsvpSchema = z.object({
  params: rsvpTokenParamsSchema,
});

export type RsvpTokenDto = z.infer<typeof rsvpTokenParamsSchema>;

export const submitRsvpBodySchema = z.object({
  status: z.enum([Status.ATTENDING, Status.MAYBE, Status.DECLINED]),
  plus_ones: z.number().int().min(0).max(9).optional(),
  dietary: z
    .enum(Object.values(Dietary) as [Dietary, ...Dietary[]])
    .optional(),
  song_request: z.string().trim().max(500).optional(),
  message: z.string().trim().max(500).optional(),
});

export type SubmitRsvpBody = z.infer<typeof submitRsvpBodySchema>;

export const submitRsvpSchema = z.object({
  params: rsvpTokenParamsSchema,
  body: submitRsvpBodySchema,
});

export type SubmitRsvpDto = z.infer<typeof submitRsvpSchema>;
